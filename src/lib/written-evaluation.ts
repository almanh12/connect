/**
 * Structured JSON evaluation for Ontario DECA prepared (written) events.
 * Mirrors the oral evaluate route’s JSON shape and markdown formatting.
 */

import { PREPARED_EVENT_SCORING } from "@/lib/ontario-deca-data";

export interface WrittenEvaluationResult {
  overall_score: number;
  pi_scores: Record<string, { score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  event_specific_tips: string[];
  overall_feedback: string;
}

/** System prompt: JSON-only response with capped PI scores (same rubric as UI). */
export function buildWrittenEvaluationJsonSystemPrompt(eventName: string): string {
  const categoryLines = Object.entries(PREPARED_EVENT_SCORING)
    .map(([name, max]) => `- "${name}" — maximum ${max} points`)
    .join("\n");

  const piJsonLines = Object.entries(PREPARED_EVENT_SCORING)
    .map(
      ([name, max]) =>
        `    "${name}": { "score": <integer 0-${max}>, "feedback": "<one or two sentences>" }`
    )
    .join(",\n");

  return `You are an expert DECA competition judge evaluating a written submission for: ${eventName}.

Official prepared-event rubric (each category has a strict maximum):
${categoryLines}

RESPOND WITH ONLY A VALID JSON OBJECT. No markdown code fences, no text before or after the JSON.

Required shape:
{
  "overall_score": <integer 0-100>,
  "pi_scores": {
${piJsonLines}
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "event_specific_tips": ["<tip 1>", "<tip 2>"],
  "overall_feedback": "<2-3 sentence summary>"
}

RULES:
- overall_score MUST equal the sum of pi_scores[*].score (all five categories).
- Each pi_scores[*].score must be an integer from 0 up to that category’s maximum (never exceed the max).
- Be encouraging but honest.`;
}

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  }
  return s;
}

export function parseWrittenEvaluationJson(rawText: string): WrittenEvaluationResult | null {
  const cleaned = stripJsonFences(rawText);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as WrittenEvaluationResult;
    if (typeof parsed.overall_score !== "number" || !parsed.pi_scores) return null;
    return sanitizeWrittenResult(parsed);
  } catch {
    return null;
  }
}

function sanitizeWrittenResult(r: WrittenEvaluationResult): WrittenEvaluationResult {
  const out: Record<string, { score: number; feedback: string }> = {};
  let sum = 0;
  for (const [name, max] of Object.entries(PREPARED_EVENT_SCORING)) {
    const row = r.pi_scores[name];
    const raw = typeof row?.score === "number" ? row.score : 0;
    const score = Math.min(max, Math.max(0, Math.round(raw)));
    const feedback = typeof row?.feedback === "string" ? row.feedback : "";
    out[name] = { score, feedback };
    sum += score;
  }
  return {
    overall_score: sum,
    pi_scores: out,
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    improvements: Array.isArray(r.improvements) ? r.improvements : [],
    event_specific_tips: Array.isArray(r.event_specific_tips) ? r.event_specific_tips : [],
    overall_feedback: typeof r.overall_feedback === "string" ? r.overall_feedback : "",
  };
}

export function flattenWrittenPiScores(
  pi: WrittenEvaluationResult["pi_scores"]
): Record<string, number> {
  const flat: Record<string, number> = {};
  for (const [k, v] of Object.entries(pi)) {
    flat[k] = v.score;
  }
  return flat;
}

/** Same markdown pattern as oral /api/practice/evaluate (formatEvaluationForDisplay). */
export function formatWrittenEvaluationMarkdown(
  result: WrittenEvaluationResult,
  eventName: string
): string {
  const lines: string[] = [];
  lines.push(`**Overall Score:** ${result.overall_score}/100`);
  lines.push("");
  lines.push("**Performance Indicator Breakdown:**");
  for (const [name, { score, feedback }] of Object.entries(result.pi_scores)) {
    const max =
      PREPARED_EVENT_SCORING[name as keyof typeof PREPARED_EVENT_SCORING];
    if (max != null) {
      lines.push(`- ${name}: ${score}/${max} — ${feedback}`);
    }
  }
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
