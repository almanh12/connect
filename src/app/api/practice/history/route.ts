import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("practice_sessions")
      .select("id, event_code, event_category, category, score, pi_scores, feedback, duration_seconds, created_at, case_study, student_response")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[practice/history] Fetch failed:", error.message);
      return NextResponse.json({ sessions: [] });
    }

    return NextResponse.json({
      sessions: (data ?? []).map((s) => ({
        id: s.id,
        event_code: s.event_code ?? s.event_category,
        event_category: s.event_category,
        category: s.category,
        score: s.score,
        pi_scores: s.pi_scores,
        feedback: s.feedback,
        duration_seconds: s.duration_seconds,
        created_at: s.created_at,
        case_study: s.case_study ?? null,
        student_response: s.student_response ?? null,
      })),
    });
  } catch (err) {
    console.error("Practice history error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
