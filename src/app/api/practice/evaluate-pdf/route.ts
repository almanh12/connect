import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getEventByCode, getCategoryTemplate } from "@/lib/ontario-deca-data";
import {
  checkPracticeEvalRateLimit,
  recordPracticeEvalUsage,
} from "@/lib/rate-limit";
import { z } from "zod";

const formEventCodeSchema = z.string().min(1).max(32).trim();

const MODEL = "claude-opus-4-6";
const MAX_PDF_SIZE_MB = 10;

function buildEvaluationSystemPrompt(eventName: string): string {
  return `You are an expert DECA competition judge and coach. A student has uploaded their work for the event: ${eventName}.

Evaluate based on DECA judging criteria:
1. Content knowledge and accuracy
2. Organization and structure
3. Professional quality
4. Use of evidence and examples
5. Recommendations and conclusions

Provide your response in this format:
- Overall Score: X/100
- Strengths: (3 bullet points)
- Areas for Improvement: (3 bullet points with actionable suggestions)
- Judge's Summary: (2-3 sentence overall assessment)

Be encouraging but honest. These are high school students.

Also return a JSON object with the PI category scores for tracking. Include this at the end of your response as: [PI_SCORES]{"category": score, ...}[/PI_SCORES]`;
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

    const rateLimit = await checkPracticeEvalRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const eventCodeRaw = formData.get("event_code");
    const eventCodeParsed = formEventCodeSchema.safeParse(
      typeof eventCodeRaw === "string" ? eventCodeRaw : ""
    );
    const event_code = eventCodeParsed.success ? eventCodeParsed.data : null;

    if (!file || !event_code) {
      return NextResponse.json(
        { error: "PDF file and a valid event_code are required" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_PDF_SIZE_MB) {
      return NextResponse.json(
        { error: `PDF must be under ${MAX_PDF_SIZE_MB} MB` },
        { status: 400 }
      );
    }

    const event = getEventByCode(event_code);
    if (!event) {
      return NextResponse.json(
        { error: "Unknown event. Use a valid Ontario DECA event code." },
        { status: 400 }
      );
    }

    let extractedText: string;
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      extractedText = result?.text ?? "";
      await parser.destroy();
    } catch (parseErr) {
      console.error("[evaluate-pdf] PDF parse error:", parseErr);
      return NextResponse.json(
        { error: "Could not extract text from PDF. Try pasting the content instead." },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "No text could be extracted from the PDF. Try pasting the content instead." },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const system = buildEvaluationSystemPrompt(event.name);
    const userContent = `[Written submission for evaluation]\n\n${extractedText}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    let content = textBlock?.type === "text" ? textBlock.text : "";

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

    await recordPracticeEvalUsage(user.id);

    const overall_score =
      pi_scores && typeof pi_scores === "object"
        ? Math.round(
            Object.values(pi_scores).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0)
          )
        : undefined;

    return NextResponse.json({ content, pi_scores, overall_score });
  } catch (err) {
    console.error("Evaluate PDF API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
