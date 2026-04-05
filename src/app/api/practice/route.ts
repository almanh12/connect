import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { OntarioDecaEvent } from "@/lib/ontario-deca-data";
import {
  getEventByCode,
  getCategoryTemplate,
  isRoleplayEvent,
  ROLEPLAY_PI_SCORING,
  PREPARED_EVENT_SCORING,
} from "@/lib/ontario-deca-data";
import {
  buildWrittenEvaluationJsonSystemPrompt,
  parseWrittenEvaluationJson,
  formatWrittenEvaluationMarkdown,
  flattenWrittenPiScores,
} from "@/lib/written-evaluation";
import {
  checkPracticeEvalRateLimit,
  recordPracticeEvalUsage,
} from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json";
import { practicePostBodySchema } from "@/lib/security/schemas";

const MODEL = "claude-opus-4-6";

function buildSystemPrompt(
  event: OntarioDecaEvent,
  requestFeedback: boolean,
  isWrittenSubmission: boolean
): string {
  const template = getCategoryTemplate(event.category_key);
  const participants = template?.participants ?? "1";
  const prepMin = template?.prep_time_minutes ?? 0;
  const presMin = template?.presentation_time_minutes ?? 10;
  const piSourceUrl = event.pi_source_page;
  const ontarioNotes = [
    ...(template?.ontario_notes ?? []),
    ...(event.ontario_restrictions ?? []),
  ];
  if (event.ontario_note) ontarioNotes.push(event.ontario_note);
  if (template?.ontario_override) ontarioNotes.push(template.ontario_override);
  if (template?.ontario_submission)
    ontarioNotes.push(`Submission: ${template.ontario_submission}`);

  const roleplayRubric = Object.entries(ROLEPLAY_PI_SCORING)
    .map(([k, v]) => `- ${k.replace("[cluster]", event.cluster)}: /${v}`)
    .join("\n");

  const preparedRubric = Object.entries(PREPARED_EVENT_SCORING)
    .map(([k, v]) => `- ${k}: /${v}`)
    .join("\n");

  const base = `You are a DECA competition judge evaluating a student for Ontario DECA in the ${event.name} (${event.code}) event.

EVENT DATA:
- Event: ${event.name} (${event.code})
- Category: ${template?.category_name ?? event.category_key}
- Cluster: ${event.cluster}
- Participants: ${participants}
- Prep time: ${prepMin} minutes
- Presentation time: ${presMin} minutes
- PI cluster: ${event.pi_cluster}
- Exam: ${event.exam ?? "N/A"}
${ontarioNotes.length > 0 ? `- Ontario notes: ${ontarioNotes.join("; ")}` : ""}

OFFICIAL PI SOURCE (use for evaluation criteria):
${piSourceUrl}

${isWrittenSubmission ? `WRITTEN/PREPARED EVENT RUBRIC (score each category, total 100):
${preparedRubric}

The student has submitted written content for evaluation. Evaluate it against the rubric above.` : `ROLEPLAY RUBRIC (score each category, total 100):
${roleplayRubric}

Present a realistic roleplay scenario relevant to ${event.cluster}. First introduce the scenario, the student's role, and the task. Then engage in back-and-forth. Stay in character as the judge/client.`}

When providing feedback, be encouraging but honest. Reference specific things they said or missed.`;

  if (requestFeedback) {
    if (isWrittenSubmission) {
      return buildWrittenEvaluationJsonSystemPrompt(event.name);
    }
    return `${base}

The student has ended their practice. Provide your final feedback in this exact format:

1. **Score:** X/100
2. **Scoring Breakdown:** (for each rubric category, show score/max and brief comment)
3. **Strengths:** (bullet list)
4. **Areas for Improvement:** (bullet list)
5. **Tips for This Event:** (bullet list)

Also return a JSON object with the PI category scores for tracking. Format: {"Knowledge & Understanding": 25, "Critical Thinking & Problem Solving": 28, ...} or for prepared events {"Executive Summary / Overview": 12, "Research & Analysis": 18, ...}. Include this at the end of your response as: [PI_SCORES]{"category": score, ...}[/PI_SCORES]`;
  }
  return base;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI features are not configured. Contact your admin." },
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

    const parsed = await parseJsonBody(request, practicePostBodySchema);
    if (!parsed.ok) return parsed.response;
    const {
      event_code,
      event_category,
      category,
      messages,
      request_feedback,
    } = parsed.data;

    const code = event_code ?? event_category;
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Event code is required" },
        { status: 400 }
      );
    }

    const event = getEventByCode(code);
    if (!event) {
      return NextResponse.json(
        { error: "Unknown event. Use a valid Ontario DECA event code." },
        { status: 400 }
      );
    }

    if (request_feedback) {
      const rateLimit = await checkPracticeEvalRateLimit(user.id);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: rateLimit.error },
          { status: 429 }
        );
      }
    }

    const anthropic = new Anthropic({ apiKey });
    const allMessages = Array.isArray(messages) ? messages : [];
    const isWrittenSubmission =
      !isRoleplayEvent(event) ||
      (allMessages.length > 0 &&
        allMessages.some((m) =>
          m.content?.includes("[Written submission for evaluation]")
        ));

    if (allMessages.length === 0 && !request_feedback && !isWrittenSubmission) {
      allMessages.push({
        role: "user",
        content: "I'm ready to begin. Please introduce the scenario.",
      });
    }

    if (request_feedback && allMessages.length > 0 && !isWrittenSubmission) {
      allMessages.push({
        role: "user",
        content: "I've finished my practice. Please provide your detailed feedback including score, scoring breakdown, strengths, areas for improvement, and tips.",
      });
    }

    const system = buildSystemPrompt(event, !!request_feedback, isWrittenSubmission);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: request_feedback ? 2048 : 1024,
      system,
      messages: allMessages.slice(-15).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    let content = textBlock?.type === "text" ? textBlock.text : "";

    if (request_feedback && isWrittenSubmission) {
      const parsed = parseWrittenEvaluationJson(content);
      if (!parsed) {
        return NextResponse.json(
          { error: "Could not parse written evaluation. Please try again." },
          { status: 500 }
        );
      }
      const formatted = formatWrittenEvaluationMarkdown(parsed, event.name);
      const flat = flattenWrittenPiScores(parsed.pi_scores);
      await recordPracticeEvalUsage(user.id);
      return NextResponse.json({
        content: formatted,
        feedback: formatted,
        pi_scores: flat,
        overall_score: parsed.overall_score,
        result: {
          strengths: parsed.strengths,
          improvements: parsed.improvements,
          event_specific_tips: parsed.event_specific_tips,
          overall_feedback: parsed.overall_feedback,
        },
      });
    }

    let pi_scores: Record<string, number> | undefined;
    const piMatch = content.match(/\[PI_SCORES\]([\s\S]*?)\[\/PI_SCORES\]/);
    if (piMatch) {
      try {
        pi_scores = JSON.parse(piMatch[1].trim()) as Record<string, number>;
        content = content.replace(/\[PI_SCORES\][\s\S]*?\[\/PI_SCORES\]/, "").trim();
      } catch {
        // ignore parse errors
      }
    }

    if (request_feedback) {
      await recordPracticeEvalUsage(user.id);
    }

    const overall_score =
      pi_scores && typeof pi_scores === "object"
        ? Math.round(
            Object.values(pi_scores).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0)
          )
        : undefined;

    return NextResponse.json({ content, pi_scores, overall_score });
  } catch (err) {
    console.error("Practice API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
