import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/security/parse-json";
import { analyticsInsightsBodySchema } from "@/lib/security/schemas";
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

    const parsed = await parseJsonBody(request, analyticsInsightsBodySchema);
    if (!parsed.ok) return parsed.response;
    const { metrics } = parsed.data;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = `You are a DECA chapter analytics advisor. You receive chapter engagement metrics and provide a plain-English summary.

Format your response with these three sections, using bullet points:
1. **What's Going Well** - 2-3 positive observations
2. **Top Concerns** - 2-3 areas that need attention
3. **Recommended Actions This Week** - Exactly 3 specific, actionable items officers can do

Be concise, encouraging, and practical. Use DECA terminology.

When competitionData is present in the metrics, consider it in your analysis:
- Members registered for competition events (DECA event codes)
- Events covered (unique event codes)
- Competition levels breakdown (Regionals, Provincials, ICDC)
- Members NOT yet registered — you may suggest reaching out to them`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyze these chapter metrics and provide insights:\n\n${JSON.stringify(metrics, null, 2)}`,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    return NextResponse.json({ insights: text });
  } catch (err) {
    console.error("Analytics insights error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
