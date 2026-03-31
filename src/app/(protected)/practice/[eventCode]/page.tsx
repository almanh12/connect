import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getEventByCode, isRoleplayEvent, isPreparedEvent } from "@/lib/ontario-deca-data";
import { EventPracticeClient } from "./event-practice-client";

type Props = { params: Promise<{ eventCode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventCode } = await params;
  const decoded = decodeURIComponent(eventCode);
  const event = getEventByCode(decoded);
  if (!event) return { title: "Practice" };
  return {
    title: `Practice: ${event.name}`,
    description: `Practice ${event.name} (${event.code}) for Ontario DECA`,
  };
}

export default async function EventPracticePage({ params }: Props) {
  const { eventCode } = await params;
  const decoded = decodeURIComponent(eventCode);
  const event = getEventByCode(decoded);
  if (!event) notFound();
  if (!isRoleplayEvent(event) && !isPreparedEvent(event)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let sessions: { id: string; score: number | null; pi_scores: unknown; feedback: string | null; duration_seconds: number | null; created_at: string }[] = [];
  const { data: sessionsData } = await supabase
    .from("practice_sessions")
    .select("id, score, pi_scores, feedback, duration_seconds, created_at")
    .eq("user_id", user.id)
    .or(`event_code.eq.${decoded},event_category.eq.${decoded}`)
    .order("created_at", { ascending: false })
    .limit(10);
  sessions = sessionsData ?? [];

  return (
    <EventPracticeClient
      event={event}
      initialSessions={sessions.map((s) => ({
        id: s.id,
        score: s.score,
        pi_scores: s.pi_scores as Record<string, number> | null | undefined,
        feedback: s.feedback,
        duration_seconds: s.duration_seconds,
        created_at: s.created_at,
      }))}
    />
  );
}
