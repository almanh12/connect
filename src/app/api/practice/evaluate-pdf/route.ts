import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getEventByCode } from "@/lib/ontario-deca-data";
import {
  checkPracticeEvalRateLimit,
  recordPracticeEvalUsage,
} from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json";
import { evaluatePdfStorageBodySchema } from "@/lib/security/schemas";

const MODEL = "claude-opus-4-6";
const BUCKET = "practice-submissions";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_CLIENT_ERROR_LEN = 450;

function clientSafeErrorMessage(err: unknown): string {
  if (err instanceof APIError) {
    return err.message.slice(0, MAX_CLIENT_ERROR_LEN);
  }
  if (err instanceof Error) {
    return err.message.slice(0, MAX_CLIENT_ERROR_LEN);
  }
  return "An unexpected error occurred.";
}

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

function isOwnedStoragePath(userId: string, storagePath: string): boolean {
  if (!storagePath || storagePath.startsWith("/") || storagePath.includes("..")) {
    return false;
  }
  const prefix = `${userId}/`;
  return storagePath.startsWith(prefix);
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

    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error("[evaluate-pdf] admin client:", e);
      return NextResponse.json(
        { error: "Server storage is not configured (missing service role key)." },
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

    const parsed = await parseJsonBody(request, evaluatePdfStorageBodySchema);
    if (!parsed.ok) return parsed.response;

    const { event_code, storage_path } = parsed.data;

    if (!isOwnedStoragePath(user.id, storage_path)) {
      return NextResponse.json(
        { error: "Invalid or unauthorized file path." },
        { status: 403 }
      );
    }

    const event = getEventByCode(event_code);
    if (!event) {
      return NextResponse.json(
        { error: "Unknown event. Use a valid Ontario DECA event code." },
        { status: 400 }
      );
    }

    const { data: fileBlob, error: downloadErr } = await admin.storage
      .from(BUCKET)
      .download(storage_path);

    if (downloadErr || !fileBlob) {
      console.error("[evaluate-pdf] download:", downloadErr);
      return NextResponse.json(
        { error: "Could not load the uploaded file. Try uploading again." },
        { status: 400 }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "The uploaded file was empty." },
        { status: 400 }
      );
    }

    const base64Data = buffer.toString("base64");

    const anthropic = new Anthropic({ apiKey });
    const system = buildEvaluationSystemPrompt(event.name);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "[Written submission for evaluation]",
            },
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data,
              },
            },
          ],
        },
      ],
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

    try {
      const { error: removeErr } = await admin.storage
        .from(BUCKET)
        .remove([storage_path]);
      if (removeErr) {
        console.warn("[evaluate-pdf] post-success cleanup:", removeErr);
      }
    } catch (cleanupErr) {
      console.warn("[evaluate-pdf] post-success cleanup:", cleanupErr);
    }

    return NextResponse.json({ content, pi_scores, overall_score });
  } catch (err) {
    console.error("[evaluate-pdf] unhandled error:", err);
    const message = clientSafeErrorMessage(err);
    const status =
      err instanceof APIError && typeof err.status === "number" ? err.status : 500;
    const httpStatus = status >= 400 && status < 600 ? status : 500;
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
