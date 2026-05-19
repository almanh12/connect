import type { SupabaseClient } from "@supabase/supabase-js";

export type DateRange = "week" | "month" | "semester" | "all" | "custom";

export function getDateRangeBounds(
  range: DateRange,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } | null {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (range === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
    return { start, end: endDate };
  }

  switch (range) {
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case "semester": {
      const m = now.getMonth();
      const start =
        m >= 0 && m <= 4
          ? new Date(now.getFullYear(), 0, 1)
          : new Date(now.getFullYear(), 7, 1);
      return { start, end };
    }
    case "all":
    case "custom":
      return null;
  }
}

/** Get previous period bounds for comparison (same length as current) */
export function getPreviousPeriodBounds(
  range: DateRange,
  currentStart: Date,
  currentEnd: Date,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } | null {
  const duration = currentEnd.getTime() - currentStart.getTime();

  if (range === "custom" && customStart && customEnd) {
    const prevEnd = new Date(currentStart);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { start: prevStart, end: prevEnd };
  }

  switch (range) {
    case "week": {
      const prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 7);
      return { start: prevStart, end: prevEnd };
    }
    case "month": {
      const prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
      const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
      return { start: prevStart, end: prevEnd };
    }
    case "semester": {
      const prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
      const m = prevEnd.getMonth();
      const prevStart =
        m >= 0 && m <= 4
          ? new Date(prevEnd.getFullYear() - 1, 7, 1)
          : new Date(prevEnd.getFullYear(), 0, 1);
      return { start: prevStart, end: prevEnd };
    }
    default:
      return null;
  }
}

export function getLastMonthBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
}

export interface AnalyticsMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  onboarding_complete: boolean;
  tier: string | null;
  engagement_score: number;
}

export interface AnalyticsEvent {
  id: string;
  title: string;
  date?: string | null;
  start_time: string;
  event_type: string | null;
}

export interface EngagementPointRow {
  user_id: string;
  points: number;
  source: string;
  reference_id: string | null;
  created_at: string;
}

export interface CompetitionRegistrationRow {
  user_id: string;
  event_code: string;
  event_name: string;
  competition_level: string;
  status: string;
}

export interface AnalyticsData {
  members: AnalyticsMember[];
  events: AnalyticsEvent[];
  attendance: { event_id: string; user_id: string; attended: boolean }[];
  engagementPoints: EngagementPointRow[];
  manualPoints: { user_id: string; points: number; created_at: string }[];
  competitionEventIds: string[];
  competitionRegistrations: CompetitionRegistrationRow[];
}

export async function fetchAnalyticsData(
  supabase: SupabaseClient,
  chapterId: string
): Promise<AnalyticsData> {
  const memberIdsRes = await supabase
    .from("profiles")
    .select("id")
    .eq("chapter_id", chapterId)
    .limit(500);

  const memberIds = (memberIdsRes.data ?? []).map((m) => m.id);
  if (memberIds.length === 0) {
    return {
      members: [],
      events: [],
      attendance: [],
      engagementPoints: [],
      manualPoints: [],
      competitionEventIds: [],
      competitionRegistrations: [],
    };
  }

  const [membersRes, eventsRes, attendanceRes, epRes, mpRes, compRegRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, created_at, onboarding_complete, tier, engagement_score")
      .eq("chapter_id", chapterId)
      .limit(500),
    supabase
      .from("events")
      .select("id, title, date, start_time, event_type")
      .eq("chapter_id", chapterId)
      .order("start_time", { ascending: false }),
    supabase
      .from("attendance")
      .select("event_id, user_id, attended")
      .limit(10000),
    supabase
      .from("engagement_points")
      .select("user_id, points, source, reference_id, created_at")
      .in("user_id", memberIds)
      .limit(5000),
    supabase
      .from("manual_points")
      .select("user_id, points, created_at")
      .in("user_id", memberIds)
      .limit(2000),
    supabase
      .from("competition_registrations")
      .select("user_id, event_code, event_name, competition_level, status")
      .eq("chapter_id", chapterId),
  ]);

  const members = membersRes.data ?? [];
  const events: AnalyticsEvent[] = (eventsRes.data ?? []).map((e) => ({
    ...e,
    title: e.title ?? "Untitled event",
  }));
  const eventIdSet = new Set(events.map((e) => e.id));
  const memberIdSet = new Set(members.map((m) => m.id));
  const attendance = (attendanceRes.data ?? []).filter(
    (a) => eventIdSet.has(a.event_id) && memberIdSet.has(a.user_id)
  );
  const engagementPoints = epRes.data ?? [];
  const manualPoints = mpRes.data ?? [];
  const competitionRegistrations = (compRegRes.data ?? []) as CompetitionRegistrationRow[];
  const competitionEventIds = events
    .filter((e) => e.event_type === "competition")
    .map((e) => e.id);

  return {
    members,
    events,
    attendance,
    engagementPoints,
    manualPoints,
    competitionEventIds,
    competitionRegistrations,
  };
}
