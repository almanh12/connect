import type { SupabaseClient } from "@supabase/supabase-js";
import { getEarnedBadges } from "./badges";

export type LeaderboardPeriod = "week" | "month" | "semester" | "all";
export type LeaderboardCategory = "overall" | "meetings" | "competitions" | "volunteering";

/** Map leaderboard category to event_type for filtering */
const CATEGORY_TO_EVENT_TYPE: Record<LeaderboardCategory, string | null> = {
  overall: null,
  meetings: "meeting",
  competitions: "competition",
  volunteering: "community_service",
};

/** Get start of current week (Sunday) */
function startOfWeek(d?: Date): Date {
  const x = d ?? new Date();
  const out = new Date(x);
  out.setDate(out.getDate() - out.getDay());
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Get start of current month */
function startOfMonth(d?: Date): Date {
  const x = d ?? new Date();
  return new Date(x.getFullYear(), x.getMonth(), 1);
}

/** Get start of current semester (Jan or Aug) */
function startOfSemester(d?: Date): Date {
  const x = d ?? new Date();
  const m = x.getMonth();
  if (m >= 0 && m <= 4) return new Date(x.getFullYear(), 0, 1);
  return new Date(x.getFullYear(), 7, 1);
}

/** Get previous period start/end for rank change comparison */
function getPreviousPeriod(period: LeaderboardPeriod): { start: Date; end: Date } | null {
  const now = new Date();
  if (period === "week") {
    const thisStart = startOfWeek();
    const prevEnd = new Date(thisStart);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(thisStart);
    prevStart.setDate(prevStart.getDate() - 7);
    return { start: prevStart, end: prevEnd };
  }
  if (period === "month") {
    const thisStart = startOfMonth();
    const prevEnd = new Date(thisStart);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(thisStart.getFullYear(), thisStart.getMonth() - 1, 1);
    return { start: prevStart, end: prevEnd };
  }
  if (period === "semester") {
    const thisStart = startOfSemester();
    const prevEnd = new Date(thisStart);
    prevEnd.setMilliseconds(-1);
    const prevStart = thisStart.getMonth() === 0
      ? new Date(thisStart.getFullYear() - 1, 7, 1)
      : new Date(thisStart.getFullYear(), 0, 1);
    return { start: prevStart, end: prevEnd };
  }
  return null;
}

export interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  grade: number | null;
  engagement_score: number;
  tier: string | null;
  badges: { id: string; name: string; description: string; icon: string }[];
  rankChange?: number; // positive = moved up, negative = moved down, 0 = no change
}

type MemberRow = { id: string; full_name: string | null; email: string | null; avatar_url: string | null; grade: number | null; engagement_score: number; tier: string | null };

/** Compute scores for a date range with optional category filter */
async function computeScoresInRange(
  supabase: SupabaseClient,
  memberIds: string[],
  startIso: string,
  endIso: string | null,
  category: LeaderboardCategory
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (const id of memberIds) scores.set(id, 0);

  const eventTypeFilter = CATEGORY_TO_EVENT_TYPE[category];

  if (eventTypeFilter) {
    // Category filter: only event_attendance points from matching event types
    let epQuery = supabase
      .from("engagement_points")
      .select("user_id, points, reference_id")
      .eq("source", "event_attendance")
      .gte("created_at", startIso);
    if (endIso) epQuery = epQuery.lte("created_at", endIso);
    const epRes = await epQuery;

    const data = epRes.data ?? [];
    const eventIds = [...new Set(data.map((r) => r.reference_id).filter(Boolean))] as string[];
    let eventTypes: Map<string, string> = new Map();
    if (eventIds.length > 0) {
      const evRes = await supabase.from("events").select("id, event_type").in("id", eventIds);
      eventTypes = new Map((evRes.data ?? []).map((e) => [e.id, e.event_type ?? ""]));
    }
    for (const r of data) {
      if (!r.reference_id || !scores.has(r.user_id)) continue;
      const et = eventTypes.get(r.reference_id) ?? "";
      if (et !== eventTypeFilter) continue;
      scores.set(r.user_id, (scores.get(r.user_id) ?? 0) + r.points);
    }
  } else {
    // Overall: all engagement_points + manual_points
    let epQuery = supabase.from("engagement_points").select("user_id, points").gte("created_at", startIso);
    let mpQuery = supabase.from("manual_points").select("user_id, points").gte("created_at", startIso);
    if (endIso) {
      epQuery = epQuery.lte("created_at", endIso);
      mpQuery = mpQuery.lte("created_at", endIso);
    }
    const [epRes, mpRes] = await Promise.all([epQuery, mpQuery]);
    for (const r of epRes.data ?? []) {
      if (scores.has(r.user_id))
        scores.set(r.user_id, (scores.get(r.user_id) ?? 0) + r.points);
    }
    for (const r of mpRes.data ?? []) {
      if (scores.has(r.user_id))
        scores.set(r.user_id, (scores.get(r.user_id) ?? 0) + r.points);
    }
  }

  return scores;
}

/** Fetch leaderboard entries for a chapter with optional filters */
export async function getLeaderboard(
  supabase: SupabaseClient,
  chapterId: string,
  period: LeaderboardPeriod,
  gradeFilter: number | null,
  category: LeaderboardCategory = "overall"
): Promise<LeaderboardEntry[]> {
  const members = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, grade, engagement_score, tier")
    .eq("chapter_id", chapterId)
    .not("engagement_score", "is", null);

  if (members.error) return [];

  let list: MemberRow[] = members.data ?? [];

  if (gradeFilter !== null) {
    list = list.filter((m) => m.grade === gradeFilter);
  }

  const memberIds = list.map((m) => m.id);

  if (period !== "all") {
    const start =
      period === "week"
        ? startOfWeek()
        : period === "month"
          ? startOfMonth()
          : startOfSemester();
    const startIso = start.toISOString();

    const scores = await computeScoresInRange(
      supabase,
      memberIds,
      startIso,
      null,
      category
    );

    const prevPeriod = getPreviousPeriod(period);
    let prevRanks: Map<string, number> = new Map();
    if (prevPeriod) {
      const prevScores = await computeScoresInRange(
        supabase,
        memberIds,
        prevPeriod.start.toISOString(),
        prevPeriod.end.toISOString(),
        category
      );
      const prevSorted = [...memberIds]
        .sort((a, b) => (prevScores.get(b) ?? 0) - (prevScores.get(a) ?? 0));
      prevSorted.forEach((id, idx) => prevRanks.set(id, idx + 1));
    }

    list = list
      .map((m) => ({
        ...m,
        engagement_score: scores.get(m.id) ?? 0,
      }))
      .sort((a, b) => b.engagement_score - a.engagement_score);

    // Attach rank change to each member (computed after sort)
    const currentRanks = new Map<string, number>();
    list.forEach((m, idx) => currentRanks.set(m.id, idx + 1));

    list = list.map((m) => {
      const curr = currentRanks.get(m.id) ?? 0;
      const prev = prevRanks.get(m.id);
      const rankChange = prev != null ? prev - curr : undefined;
      return { ...m, rankChange };
    });
  } else {
    // All-time: use profile scores, but category filter requires recomputing
    if (category !== "overall") {
      const start = new Date(0).toISOString();
      const scores = await computeScoresInRange(
        supabase,
        memberIds,
        start,
        null,
        category
      );
      list = list
        .map((m) => ({
          ...m,
          engagement_score: scores.get(m.id) ?? 0,
        }))
        .sort((a, b) => b.engagement_score - a.engagement_score);
    } else {
      list = [...list].sort(
        (a, b) => (b.engagement_score ?? 0) - (a.engagement_score ?? 0)
      );
    }
  }

  // For Chapter MVP badge: highest score in the selected period
  const periodScoresForMvp = list.map((m) => ({
    userId: m.id,
    score: m.engagement_score ?? 0,
  }));

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    let badges: { id: string; name: string; description: string; icon: string }[] = [];
    try {
      badges = await getEarnedBadges(supabase, m.id, chapterId, {
        allMemberMonthlyScores: periodScoresForMvp,
      });
    } catch (err) {
      console.error("[leaderboard] getEarnedBadges error for", m.id, err);
    }
    entries.push({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      avatar_url: m.avatar_url,
      grade: m.grade,
      engagement_score: m.engagement_score ?? 0,
      tier: m.tier,
      badges,
      rankChange: (m as MemberRow & { rankChange?: number }).rankChange,
    });
  }

  return entries;
}
