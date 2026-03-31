import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/security/parse-json";
import { practiceStartBodySchema } from "@/lib/security/schemas";

/**
 * Create a new practice session when the user clicks "Start Practice" only.
 * Inserts a single row with no score — submit flow must PATCH via /api/practice/save.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, practiceStartBodySchema);
    if (!parsed.ok) return parsed.response;
    const { event_code, event_category, category, case_study } = parsed.data;

    const catDisplay = event_category ?? event_code ?? "";

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      event_category: catDisplay,
      score: null,
      feedback: null,
    };
    if (event_code && typeof event_code === "string") {
      insertPayload.event_code = event_code;
    }
    if (category && typeof category === "string") {
      insertPayload.category = category;
    }
    if (typeof case_study === "string" && case_study.length > 0) {
      insertPayload.case_study = case_study;
    }

    const { data, error } = await supabase
      .from("practice_sessions")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      console.error("[practice/start] Insert failed:", error.message, error.code);
      return NextResponse.json(
        { error: "Could not start practice session" },
        { status: 500 }
      );
    }

    console.log("[practice/start] Session created:", data?.id);
    revalidatePath("/practice");
    return NextResponse.json({ id: data?.id });
  } catch (err) {
    console.error("Practice start error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
