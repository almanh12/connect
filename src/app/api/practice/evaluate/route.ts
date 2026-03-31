import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getEventByCode, getCategoryTemplate } from "@/lib/ontario-deca-data";
import { buildEvaluationPrompt } from "@/lib/case-evaluator";
import {
  checkPracticeEvalRateLimit,
  recordPracticeEvalUsage,
} from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json";
import { evaluateBodySchema } from "@/lib/security/schemas";

const MODEL = "claude-opus-4-6";

export interface EvaluationResult {
  overall_score: number;
  pi_scores: {
    knowledge_understanding: { score: number; feedback: string };
    critical_thinking: { score: number; feedback: string };
    communication: { score: number; feedback: string };
    professional_presence: { score: number; feedback: string };
  };
  strengths: string[];
  improvements: string[];
  event_specific_tips: string[];
  overall_feedback: string;
}

function parseEvaluationResponse(text: string): EvaluationResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as EvaluationResult;
    if (typeof parsed.overall_score !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatEvaluationForDisplay(result: EvaluationResult, eventName: string): string {
  const lines: string[] = [];
  lines.push(`**Overall Score:** ${result.overall_score}/100`);
  lines.push("");
  lines.push("**Performance Indicator Breakdown:**");
  lines.push(`- Knowledge & Understanding: ${result.pi_scores.knowledge_understanding.score}/30 — ${result.pi_scores.knowledge_understanding.feedback}`);
  lines.push(`- Critical Thinking & Problem Solving: ${result.pi_scores.critical_thinking.score}/30 — ${result.pi_scores.critical_thinking.feedback}`);
  lines.push(`- Communication & Presentation Skills: ${result.pi_scores.communication.score}/25 — ${result.pi_scores.communication.feedback}`);
  lines.push(`- Professional Presence & Poise: ${result.pi_scores.professional_presence.score}/15 — ${result.pi_scores.professional_presence.feedback}`);
  lines.push("");
  lines.push("**Strengths:**");
  result.strengths.forEach((s) => lines.push(`- ${s}`));
  lines.push("");
  lines.push("**Areas for Improvement:**");
  result.improvements.forEach((i) => lines.push(`- ${i}`));
  lines.push("");
  lines.push("**Tips for " + eventName + ":**");
  result.event_specific_tips.forEach((t) => lines.push(`- ${t}`));
  lines.push("");
  lines.push("**Overall:** " + result.overall_feedback);
  return lines.join("\n");
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

    const parsed = await parseJsonBody(request, evaluateBodySchema);
    if (!parsed.ok) return parsed.response;
    const { event_code, case_study, student_response, instructional_area } =
      parsed.data;

    const event = getEventByCode(event_code);
    if (!event) {
      return NextResponse.json(
        { error: "Unknown event" },
        { status: 400 }
      );
    }

    const rateLimit = await checkPracticeEvalRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: 429 }
      );
    }

    const template = getCategoryTemplate(event.category_key);
    const eventData = {
      event,
      template,
      instructionalArea: instructional_area ?? "the scenario",
    };

    const prompt = buildEvaluationPrompt(case_study, student_response, eventData);
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText = textBlock?.type === "text" ? textBlock.text : "";

    const result = parseEvaluationResponse(rawText);
    if (!result) {
      return NextResponse.json(
        { error: "Could not parse evaluation response", raw: rawText },
        { status: 500 }
      );
    }

    await recordPracticeEvalUsage(user.id);

    const formattedFeedback = formatEvaluationForDisplay(result, event.name);

    const pi_scores: Record<string, number> = {
      "Knowledge & Understanding": result.pi_scores.knowledge_understanding.score,
      "Critical Thinking & Problem Solving": result.pi_scores.critical_thinking.score,
      "Communication & Presentation Skills": result.pi_scores.communication.score,
      "Professional Presence & Poise": result.pi_scores.professional_presence.score,
    };

    return NextResponse.json({
      overall_score: result.overall_score,
      pi_scores,
      feedback: formattedFeedback,
      result,
    });
  } catch (err) {
    console.error("Evaluate API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
