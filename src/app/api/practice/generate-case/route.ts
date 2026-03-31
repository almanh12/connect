import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { generateCase } from "@/lib/case-generator";
import { buildCaseStudyPrompt } from "@/lib/case-prompt";
import { buildCaseGenerationParams } from "@/lib/case-generation-dataset";
import {
  buildEventSituationPrompt,
  assembleCaseDocument,
} from "@/lib/case-prompt-dataset";
import { parseJsonBody } from "@/lib/security/parse-json";
import { generateCaseBodySchema } from "@/lib/security/schemas";

const MODEL = "claude-opus-4-6";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[generate-case] ANTHROPIC_API_KEY is not set");
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

    const parsed = await parseJsonBody(request, generateCaseBodySchema);
    if (!parsed.ok) return parsed.response;
    const { event_code } = parsed.data;

    const anthropic = new Anthropic({ apiKey });
    let caseStudy: string;
    let caseData: {
      cluster: string;
      instructionalArea: string;
      eventCode: string;
    };

    const datasetParams = buildCaseGenerationParams(event_code);

    if (datasetParams) {
      // Use Ontario case generation dataset
      const prompt = buildEventSituationPrompt(datasetParams);
      console.log("[generate-case] Using dataset, model:", MODEL, "event:", event_code);

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const eventSituation = textBlock?.type === "text" ? textBlock.text.trim() : "";

      if (!eventSituation) {
        console.error("[generate-case] Empty Event Situation from API for event:", event_code);
        return NextResponse.json(
          { error: "Could not generate case study. Please try again." },
          { status: 500 }
        );
      }

      caseStudy = assembleCaseDocument(datasetParams, eventSituation);
      caseData = {
        cluster: datasetParams.event.cluster,
        instructionalArea: datasetParams.instructionalArea,
        eventCode: datasetParams.event.code,
      };
    } else {
      // Fallback to generic case generator
      console.warn(
        "[generate-case] Event not in dataset, using fallback. event_code:",
        event_code
      );

      const legacyCaseData = generateCase(event_code);
      if (!legacyCaseData) {
        console.error("[generate-case] generateCase returned null for event_code:", event_code);
        return NextResponse.json(
          { error: "Could not generate case for this event", debug: `Event ${event_code} not supported for roleplay` },
          { status: 400 }
        );
      }

      const prompt = buildCaseStudyPrompt(legacyCaseData);
      console.log("[generate-case] Using fallback, model:", MODEL, "event:", event_code);

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      caseStudy = textBlock?.type === "text" ? textBlock.text.trim() : "";
      caseData = {
        cluster: legacyCaseData.cluster,
        instructionalArea: legacyCaseData.instructionalArea,
        eventCode: legacyCaseData.eventCode,
      };
    }

    return NextResponse.json({
      case_study: caseStudy,
      case_data: caseData,
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    const apiErr = err as { status?: number; error?: { type?: string; message?: string }; requestID?: string };
    console.error("[generate-case] Anthropic API failed:", errMessage);
    console.error("[generate-case] Full error details:", {
      status: apiErr?.status,
      errorType: apiErr?.error?.type,
      errorMessage: apiErr?.error?.message,
      requestID: apiErr?.requestID,
      errorObj: apiErr?.error,
    });
    if (err instanceof Error && err.stack) {
      console.error("[generate-case] Stack trace:", err.stack);
    }
    const debugMsg = process.env.NODE_ENV === "development" ? errMessage : undefined;
    return NextResponse.json(
      {
        error: "Could not generate case study. Please try again.",
        debug: debugMsg,
      },
      { status: 500 }
    );
  }
}
