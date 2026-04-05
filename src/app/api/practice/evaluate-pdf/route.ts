import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getEventByCode } from "@/lib/ontario-deca-data";
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
    const system = buildWrittenEvaluationJsonSystemPrompt(event.name);

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
    const rawText = textBlock?.type === "text" ? textBlock.text : "";

    const evalParsed = parseWrittenEvaluationJson(rawText);
    if (!evalParsed) {
      return NextResponse.json(
        { error: "Could not parse written evaluation. Please try again." },
        { status: 500 }
      );
    }

    const content = formatWrittenEvaluationMarkdown(evalParsed, event.name);
    const pi_scores = flattenWrittenPiScores(evalParsed.pi_scores);
    const overall_score = evalParsed.overall_score;

    await recordPracticeEvalUsage(user.id);

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

    return NextResponse.json({
      content,
      feedback: content,
      pi_scores,
      overall_score,
      result: {
        strengths: evalParsed.strengths,
        improvements: evalParsed.improvements,
        event_specific_tips: evalParsed.event_specific_tips,
        overall_feedback: evalParsed.overall_feedback,
      },
    });
  } catch (err) {
    console.error("[evaluate-pdf] unhandled error:", err);
    const message = clientSafeErrorMessage(err);
    const status =
      err instanceof APIError && typeof err.status === "number" ? err.status : 500;
    const httpStatus = status >= 400 && status < 600 ? status : 500;
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
