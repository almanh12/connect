import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { SessionDetailClient } from "./session-detail-client";

export const metadata: Metadata = {
  title: "Practice Session | Competition Practice",
  description: "View your practice session details and feedback.",
};

export const dynamic = "force-dynamic";

export default async function PracticeSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: session, error } = await supabase
    .from("practice_sessions")
    .select(
      "id, event_code, event_category, category, score, pi_scores, feedback, duration_seconds, created_at, case_study, student_response"
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !session) notFound();

  return (
    <SessionDetailClient
      session={{
        id: session.id,
        event_code: session.event_code ?? session.event_category,
        event_category: session.event_category,
        category: session.category,
        score: session.score,
        pi_scores: session.pi_scores as Record<string, number> | null,
        feedback: session.feedback,
        duration_seconds: session.duration_seconds,
        created_at: session.created_at,
        case_study: session.case_study ?? null,
        student_response: session.student_response ?? null,
      }}
    />
  );
}
