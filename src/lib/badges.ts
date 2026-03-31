import type { SupabaseClient } from "@supabase/supabase-js";
import { parseEventDateTime } from "./utils";

/** Badge definitions */
export const BADGES = [
  {
    id: "competition_ready",
    name: "Competition Ready",
    description: "Competed in at least 1 event",
    icon: "🏆",
  },
  {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Attended 5+ social events",
    icon: "🦋",
  },
  {
    id: "perfect_attendance",
    name: "Perfect Attendance",
    description: "Attended all mandatory events this month",
    icon: "✅",
  },
  {
    id: "recruiter",
    name: "Recruiter",
    description: "Recruited 3+ members",
    icon: "📢",
  },
  {
    id: "mentor",
    name: "Mentor",
    description: "Mentored another member",
    icon: "🎓",
  },
  {
    id: "chapter_mvp",
    name: "Chapter MVP",
    description: "Highest score this month",
    icon: "⭐",
  },
  {
    id: "first_event",
    name: "First Event",
    description: "Attended your first chapter event",
    icon: "🎯",
  },
  {
    id: "week_streak_3",
    name: "3-Week Streak",
    description: "Attended events 3 weeks in a row",
    icon: "🔥",
  },
  {
    id: "week_streak_5",
    name: "5-Week Streak",
    description: "Attended events 5 weeks in a row",
    icon: "🔥",
  },
  {
    id: "week_streak_10",
    name: "10-Week Streak",
    description: "Attended events 10 weeks in a row",
    icon: "🔥",
  },
  {
    id: "milestone_100",
    name: "100 Points",
    description: "Earned 100 engagement points",
    icon: "💯",
  },
  {
    id: "milestone_250",
    name: "250 Points",
    description: "Earned 250 engagement points",
    icon: "🌟",
  },
  {
    id: "milestone_500",
    name: "500 Points",
    description: "Earned 500 engagement points",
    icon: "💎",
  },
] as const;

export type BadgeId = (typeof BADGES)[number]["id"];

export function getBadgeById(id: string) {
  return BADGES.find((b) => b.id === id);
}

export interface EarnedBadge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
}

/** Compute which badges a user has earned (server-side, needs Supabase) */
export async function getEarnedBadges(
  supabase: SupabaseClient,
  userId: string,
  chapterId: string,
  options?: {
    /** For Chapter MVP: need all members' monthly scores to compare */
    allMemberMonthlyScores?: { userId: string; score: number }[];
  }
): Promise<EarnedBadge[]> {
  const earned: EarnedBadge[] = [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Competition Ready: attended at least 1 competition event
  const { data: compAttendances } = await supabase
    .from("attendance")
    .select("event_id")
    .eq("user_id", userId)
    .eq("attended", true);

  if (compAttendances && compAttendances.length > 0) {
    const eventIds = compAttendances.map((a) => a.event_id);
    const { data: compEvents } = await supabase
      .from("events")
      .select("id")
      .in("id", eventIds)
      .eq("event_type", "competition");
    if (compEvents && compEvents.length > 0) {
      earned.push(getBadgeById("competition_ready")!);
    }
  }

  // Social Butterfly: attended 5+ social events
  const { data: socialAttendances } = await supabase
    .from("attendance")
    .select("event_id")
    .eq("user_id", userId)
    .eq("attended", true);

  if (socialAttendances && socialAttendances.length > 0) {
    const eventIds = socialAttendances.map((a) => a.event_id);
    const { data: socialEvents } = await supabase
      .from("events")
      .select("id")
      .in("id", eventIds)
      .eq("event_type", "social");
    if (socialEvents && socialEvents.length >= 5) {
      earned.push(getBadgeById("social_butterfly")!);
    }
  }

  // Perfect Attendance: attended all mandatory events this month
  const { data: mandatoryEvents } = await supabase
    .from("events")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("is_mandatory", true)
    .gte("start_time", startOfMonth.toISOString());

  if (mandatoryEvents && mandatoryEvents.length > 0) {
    const mandatoryIds = mandatoryEvents.map((e) => e.id);
    const { data: userAttended } = await supabase
      .from("attendance")
      .select("event_id")
      .eq("user_id", userId)
      .eq("attended", true)
      .in("event_id", mandatoryIds);
    const attendedIds = new Set((userAttended ?? []).map((a) => a.event_id));
    const allAttended = mandatoryIds.every((id) => attendedIds.has(id));
    if (allAttended) {
      earned.push(getBadgeById("perfect_attendance")!);
    }
  }

  // Recruiter: 3+ recruitment points (engagement_points source=recruitment or manual_points reason contains recruit)
  const { data: recruitEp } = await supabase
    .from("engagement_points")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "recruitment");
  const { data: recruitMp } = await supabase
    .from("manual_points")
    .select("reason")
    .eq("user_id", userId);
  const recruitMpCount =
    recruitMp?.filter((r) => r.reason?.toLowerCase().includes("recruit")).length ?? 0;
  const recruitCount = (recruitEp?.length ?? 0) + recruitMpCount;
  if (recruitCount >= 3) {
    earned.push(getBadgeById("recruiter")!);
  }

  // Mentor: has mentorship points
  const { data: mentorEp } = await supabase
    .from("engagement_points")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "mentorship");
  const { data: mentorMp } = await supabase
    .from("manual_points")
    .select("reason")
    .eq("user_id", userId);
  const mentorMpCount =
    mentorMp?.filter((m) => m.reason?.toLowerCase().includes("mentor")).length ?? 0;
  if ((mentorEp?.length ?? 0) > 0 || mentorMpCount > 0) {
    earned.push(getBadgeById("mentor")!);
  }

  // Chapter MVP: highest score in the given period (leaderboard passes period scores)
  if (options?.allMemberMonthlyScores && options.allMemberMonthlyScores.length > 0) {
    const sorted = [...options.allMemberMonthlyScores].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    if (top && top.userId === userId && top.score > 0) {
      earned.push(getBadgeById("chapter_mvp")!);
    }
  }

  // First Event: attended at least 1 event
  const { data: firstAtt } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .eq("attended", true)
    .limit(1);
  if (firstAtt && firstAtt.length > 0) {
    earned.push(getBadgeById("first_event")!);
  }

  // Week Streaks: consecutive weeks with attendance
  const { data: allAtt } = await supabase
    .from("attendance")
    .select("event_id")
    .eq("user_id", userId)
    .eq("attended", true);
  if (allAtt && allAtt.length > 0) {
    const eventIds = allAtt.map((a) => a.event_id);
    const { data: evts } = await supabase
      .from("events")
      .select("date, start_time")
      .in("id", eventIds);
    const weeks = new Set(
      (evts ?? [])
        .map((e) => {
          const d = parseEventDateTime(e.start_time ?? "", e.date);
          if (Number.isNaN(d.getTime())) return null;
          d.setDate(d.getDate() - d.getDay());
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
        .filter((t): t is number => t != null)
    );
    const sortedWeeks = [...weeks].sort((a, b) => a - b);
    let maxStreak = 0;
    let streak = 1;
    for (let i = 1; i < sortedWeeks.length; i++) {
      const diff = (sortedWeeks[i]! - sortedWeeks[i - 1]!) / (7 * 24 * 60 * 60 * 1000);
      if (diff <= 1) streak++;
      else {
        maxStreak = Math.max(maxStreak, streak);
        streak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, streak);
    if (maxStreak >= 10) earned.push(getBadgeById("week_streak_10")!);
    if (maxStreak >= 5) earned.push(getBadgeById("week_streak_5")!);
    if (maxStreak >= 3) earned.push(getBadgeById("week_streak_3")!);
  }

  // Point Milestones: total score thresholds
  const { data: epAll } = await supabase
    .from("engagement_points")
    .select("points")
    .eq("user_id", userId);
  const { data: mpAll } = await supabase
    .from("manual_points")
    .select("points")
    .eq("user_id", userId);
  const totalScore =
    (epAll ?? []).reduce((s, r) => s + r.points, 0) +
    (mpAll ?? []).reduce((s, r) => s + r.points, 0);
  if (totalScore >= 500) earned.push(getBadgeById("milestone_500")!);
  if (totalScore >= 250) earned.push(getBadgeById("milestone_250")!);
  if (totalScore >= 100) earned.push(getBadgeById("milestone_100")!);

  return earned;
}
