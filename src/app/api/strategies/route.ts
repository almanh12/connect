import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseJsonBodyOrEmpty } from "@/lib/security/parse-json";
import { strategiesPostBodySchema } from "@/lib/security/schemas";
import { isAdminRole } from "@/lib/roles";

const MODEL = "claude-opus-4-6";

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, chapter_id")
      .eq("id", user.id)
      .single();

    if (!isAdminRole(profile?.role) || !profile?.chapter_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chapterId = profile.chapter_id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      { data: members },
      { data: attendances },
      { data: events },
      { data: eventTypes },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, updated_at, tier")
        .eq("chapter_id", chapterId),
      supabase
        .from("attendance")
        .select("event_id, attended, user_id"),
      supabase
        .from("events")
        .select("id, event_type, is_mandatory, start_time")
        .eq("chapter_id", chapterId),
      supabase
        .from("events")
        .select("event_type")
        .eq("chapter_id", chapterId),
    ]);

    const memberIds = new Set((members ?? []).map((m) => m.id));
    const totalMembers = memberIds.size;

    const activeUserIds = new Set(
      (members ?? []).filter((m) => new Date(m.updated_at) >= thirtyDaysAgo).map((m) => m.id)
    );
    const inactiveCount = totalMembers - activeUserIds.size;

    const eventIds = new Set((events ?? []).map((e) => e.id));
    const attendanceByEvent = new Map<string, { attended: number; total: number }>();
    for (const e of events ?? []) {
      const atts = (attendances ?? []).filter((a) => a.event_id === e.id);
      const total = atts.length;
      const attended = atts.filter((a) => a.attended).length;
      attendanceByEvent.set(e.id, { attended, total });
    }
    const rates = [...attendanceByEvent.values()].filter((r) => r.total > 0);
    const avgAttendanceRate =
      rates.length > 0
        ? rates.reduce((s, r) => s + r.attended / r.total, 0) / rates.length
        : 0;

    const typeCounts = (eventTypes ?? []).reduce(
      (acc, e) => {
        acc[e.event_type ?? "other"] = (acc[e.event_type ?? "other"] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const mostPopular = sortedTypes[0]?.[0] ?? "N/A";
    const leastPopular = sortedTypes[sortedTypes.length - 1]?.[0] ?? "N/A";

    const competitionEvents = (events ?? []).filter((e) => e.event_type === "competition");
    const compEventIds = new Set(competitionEvents.map((e) => e.id));
    const compRsvps = (attendances ?? []).filter((a) => compEventIds.has(a.event_id));
    const compSignUps = new Set(compRsvps.map((a) => a.user_id)).size;
    const compSignUpRate =
      totalMembers > 0 ? Math.round((compSignUps / totalMembers) * 100) : 0;

    const monthName = now.toLocaleString("default", { month: "long" });

    const parsed = await parseJsonBodyOrEmpty(request, strategiesPostBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const intakeChallenges = body.challenges ?? [];
    const intakeDescription = body.description ?? "";
    const intakeTimeline = body.timeline ?? "This month";
    const intakeResources = body.resources ?? [];

    const tierBreakdown = (members ?? []).reduce(
      (acc: Record<string, number>, m: { tier?: string }) => {
        const t = m.tier ?? "bronze";
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      },
      {}
    );
    const eventCount = (events ?? []).filter(
      (e: { start_time?: string }) =>
        new Date(e.start_time ?? 0) >= startOfMonth
    ).length;

    const systemPrompt = `You are a DECA chapter strategy advisor. Generate 3-4 targeted engagement strategies based on the chapter's specific challenges and resources.

CHAPTER DATA:
- Members: ${totalMembers}
- Events this month: ${eventCount}
- Avg attendance: ${Math.round(avgAttendanceRate * 100)}%
- Active tiers: ${JSON.stringify(tierBreakdown)}

CHALLENGES IDENTIFIED BY LEADERSHIP:
${intakeChallenges.length > 0 ? intakeChallenges.join(", ") : "Not specified"}

ADDITIONAL CONTEXT FROM LEADERSHIP:
${intakeDescription || "None provided"}

TIMELINE:
${intakeTimeline}

AVAILABLE RESOURCES:
${intakeResources.length > 0 ? intakeResources.join(", ") : "Not specified"}

For each strategy, return a JSON array with objects containing:
- "title": concise, action-oriented strategy name
- "priority": "high", "medium", or "low"
- "tags": array of category tags (e.g., recruitment, engagement, competition, culture, fundraising)
- "problem": 1-2 sentences connecting to their stated challenges
- "steps": array of 4-6 specific, actionable bullet points
- "expected_impact": 1 sentence
- "timeline": specific milestones that fit their stated timeline
- "success_metrics": array of 2-3 measurable KPIs to track progress

Make strategies specific to their situation, not generic. Reference their actual challenges and resources. Prioritize based on their timeline.
Return ONLY valid JSON array, no other text.`;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate 3-4 strategies. Return ONLY a JSON array.`,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "[]";
    let rawStrategies: unknown[];
    try {
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
      rawStrategies = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawStrategies = [];
    }

    const strategies = rawStrategies.map((s: unknown) => {
      const rec =
        s && typeof s === "object" ? (s as Record<string, unknown>) : {};
      const steps = Array.isArray(rec.steps) ? rec.steps : [];
      return {
        title: rec.title ?? "Strategy",
        priority: rec.priority ?? "medium",
        tags: Array.isArray(rec.tags) ? rec.tags : [],
        problem_statement: rec.problem ?? "",
        action_steps: steps.map((st: unknown) => ({
          text: typeof st === "string" ? st : String(st),
          completed: false,
          completed_at: null,
        })),
        expected_impact: rec.expected_impact ?? "",
        timeline: rec.timeline ?? "",
        success_metrics: Array.isArray(rec.success_metrics)
          ? rec.success_metrics
          : [],
        intake_data: {
          challenges: intakeChallenges,
          description: intakeDescription,
          timeline: intakeTimeline,
          resources: intakeResources,
        },
      };
    });

    return NextResponse.json({ strategies });
  } catch (err) {
    console.error("Strategies API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
