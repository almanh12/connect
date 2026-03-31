import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { PracticeHubClient } from "./practice-hub-client";

export const metadata: Metadata = {
  title: "Competition Practice",
  description: "Practice Ontario DECA competitive events with AI feedback.",
};

export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileErr) console.warn("[practice] Profile fetch failed:", profileErr.message);

  let sessions: { id: string; event_code: string | null; event_category: string; category: string | null; score: number | null; pi_scores: unknown; feedback: string | null; duration_seconds: number | null; created_at: string; case_study: string | null; student_response: string | null }[] = [];
  const { data: sessionsData, error: sessionsErr } = await supabase
    .from("practice_sessions")
    .select("id, event_code, event_category, category, score, pi_scores, feedback, duration_seconds, created_at, case_study, student_response")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (sessionsErr) {
    console.warn("[practice] Practice sessions fetch failed:", sessionsErr.message);
  } else {
    sessions = sessionsData ?? [];
  }

  const userEventCodes = (profile?.interests as string[] | null) ?? [];

  return (
    <PracticeHubClient
      profile={profile as Profile | null}
      userEventCodes={userEventCodes}
      initialTab={tab === "history" ? "practice-history" : "all-events"}
      initialSessions={sessions.map((s) => ({
        id: s.id,
        event_code: s.event_code ?? s.event_category,
        event_category: s.event_category,
        category: s.category,
        score: s.score,
        pi_scores: s.pi_scores as Record<string, number> | null | undefined,
        feedback: s.feedback,
        duration_seconds: s.duration_seconds,
        created_at: s.created_at,
        case_study: s.case_study ?? null,
        student_response: s.student_response ?? null,
      }))}
    />
  );
}
