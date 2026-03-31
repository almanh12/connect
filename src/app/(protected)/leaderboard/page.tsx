import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeaderboardClient } from "./leaderboard-client";
import {
  getLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardCategory,
} from "@/lib/leaderboard";
import { getTierProgress } from "@/lib/points";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Chapter engagement leaderboard. Compete, earn badges, and climb the ranks.",
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; grade?: string; category?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("chapter_id, engagement_score, tier")
    .eq("id", user.id)
    .single();

  if (!profile?.chapter_id) redirect("/chapter-setup");

  const period = (
    params.period === "week" || params.period === "month" || params.period === "semester"
      ? params.period
      : "all"
  ) as LeaderboardPeriod;
  const gradeFilter = params.grade ? parseInt(params.grade, 10) : null;
  const category = (
    params.category === "meetings" ||
    params.category === "competitions" ||
    params.category === "volunteering"
      ? params.category
      : "overall"
  ) as LeaderboardCategory;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let entries: Awaited<ReturnType<typeof getLeaderboard>> = [];
  let allMembers: { grade: number | null }[] | null = null;
  let epRes: { data: { points: number; source: string | null }[] | null } = { data: [] };
  let mpRes: { data: { points: number }[] | null } = { data: [] };

  try {
    const [entriesResult, membersResult, epResult, mpResult] = await Promise.all([
      getLeaderboard(
        supabase,
        profile.chapter_id,
        period,
        Number.isNaN(gradeFilter) ? null : gradeFilter,
        category
      ),
      supabase
        .from("profiles")
        .select("grade")
        .eq("chapter_id", profile.chapter_id)
        .not("grade", "is", null),
      supabase
        .from("engagement_points")
        .select("points, source")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("manual_points")
        .select("points")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString()),
    ]);

    entries = Array.isArray(entriesResult) ? entriesResult : [];
    allMembers = membersResult?.data ?? null;
    epRes = epResult;
    mpRes = mpResult;
  } catch (err) {
    console.error("[leaderboard] Error loading data:", err);
  }

  const grades = [...new Set((allMembers ?? []).map((m) => m.grade).filter((g): g is number => g != null))].sort(
    (a, b) => a - b
  );

  const score = profile?.engagement_score ?? 0;
  const tierProgress = getTierProgress(score);

  const monthlyBySource: Record<string, number> = {};
  for (const r of epRes?.data ?? []) {
    const src = r.source ?? "other";
    monthlyBySource[src] = (monthlyBySource[src] ?? 0) + r.points;
  }
  const manualSum = (mpRes?.data ?? []).reduce((s, r) => s + r.points, 0);
  if (manualSum > 0) monthlyBySource.manual_bonus = (monthlyBySource.manual_bonus ?? 0) + manualSum;

  const currentUserRank = entries.findIndex((e) => e.id === user.id) + 1;
  const currentUserEntry = entries.find((e) => e.id === user.id);

  return (
    <div className="space-y-6">
      <LeaderboardClient
        entries={entries}
        currentUserId={user.id}
        grades={grades}
        currentUserRank={currentUserRank || entries.length + 1}
        currentUserScore={currentUserEntry?.engagement_score ?? score}
        currentUserTier={currentUserEntry?.tier ?? profile?.tier ?? tierProgress.currentTier}
        tierProgress={tierProgress}
        monthlyBreakdown={monthlyBySource}
      />
    </div>
  );
}
