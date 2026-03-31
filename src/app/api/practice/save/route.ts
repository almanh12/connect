import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { PRACTICE_POINTS, awardPoints, recalculateUserScore } from "@/lib/points";
import { parseJsonBody } from "@/lib/security/parse-json";
import { practiceSaveBodySchema } from "@/lib/security/schemas";

/**
 * Update an existing practice session after evaluation (submit flow only).
 * Does NOT insert — use POST /api/practice/start when the user begins practice.
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

    const parsed = await parseJsonBody(request, practiceSaveBodySchema);
    if (!parsed.ok) return parsed.response;
    const {
      session_id,
      event_code,
      event_category,
      category,
      score,
      pi_scores,
      feedback,
      duration_seconds,
      case_study,
      student_response,
    } = parsed.data;

    const catDisplay = event_category ?? event_code ?? "";
    const updatePayload: Record<string, unknown> = {
      score: typeof score === "number" ? score : null,
      feedback: typeof feedback === "string" ? feedback : null,
    };
    if (typeof duration_seconds === "number") {
      updatePayload.duration_seconds = duration_seconds;
    }
    if (typeof case_study === "string") {
      updatePayload.case_study = case_study;
    }
    if (typeof student_response === "string") {
      updatePayload.student_response = student_response;
    }
    if (pi_scores && typeof pi_scores === "object") {
      updatePayload.pi_scores = pi_scores;
    }

    const { data: updatedRows, error: updateErr } = await supabase
      .from("practice_sessions")
      .update(updatePayload)
      .eq("id", session_id)
      .eq("user_id", user.id)
      .select("id");

    if (updateErr) {
      console.error(
        "[practice/save] Update failed:",
        updateErr.message,
        updateErr.code,
        "session_id:",
        session_id
      );
      return NextResponse.json(
        { error: "Could not update practice session" },
        { status: 500 }
      );
    }

    const updated = updatedRows?.[0];
    if (!updated) {
      const { data: canRead } = await supabase
        .from("practice_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (canRead) {
        console.error(
          "[practice/save] UPDATE matched 0 rows but row is readable — likely missing RLS UPDATE policy on practice_sessions."
        );
        return NextResponse.json(
          {
            error:
              "Could not save your results (database permissions). Ask an admin to run the Supabase migration that adds UPDATE policy for practice_sessions.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: "Session not found or it may have been deleted. Start a new practice.",
        },
        { status: 404 }
      );
    }

    const awardErr = await awardPoints(supabase, user.id, PRACTICE_POINTS, "practice_session", {
      description: "Practice session completed",
      referenceId: updated.id ?? null,
    });
    if (awardErr?.error) {
      console.warn("[practice/save] Points award failed:", awardErr.error);
    } else {
      await recalculateUserScore(supabase, user.id);
      revalidatePath("/leaderboard");
    }

    console.log("[practice/save] Update success:", updated.id);
    revalidatePath("/practice");
    return NextResponse.json({ id: updated.id, pointsEarned: PRACTICE_POINTS });
  } catch (err) {
    console.error("Practice save error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
