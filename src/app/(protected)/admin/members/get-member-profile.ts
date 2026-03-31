"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { parseEventDateTime } from "@/lib/utils";
import { parseActionInput } from "@/lib/security/parse-action";
import { getMemberProfileParamSchema } from "@/lib/security/schemas";

export interface MemberProfileData {
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    grade: number | null;
    role: string;
    tier: string | null;
    engagement_score: number;
    experience_level: string | null;
    interests: string[] | null;
    avatar_url: string | null;
    created_at: string;
  };
  attendanceHistory: { date: string; attended: number; total: number }[];
  pointsBreakdown: { label: string; value: number; color: string }[];
}

const POINT_CATEGORIES: Record<string, { label: string; color: string }> = {
  event_attendance: { label: "Meetings/Events", color: "#0072CE" },
  manual_bonus: { label: "Bonuses", color: "#C8A415" },
  streak_bonus: { label: "Streaks", color: "#10B981" },
  recruitment: { label: "Recruitment", color: "#8B5CF6" },
  mentorship: { label: "Mentorship", color: "#EC4899" },
};

export async function getMemberProfile(
  memberId: string
): Promise<MemberProfileData | { error: string }> {
  const idParsed = parseActionInput(getMemberProfileParamSchema, memberId);
  if (!idParsed.ok) return { error: idParsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!myProfile || !isAdminRole(myProfile.role)) {
    return { error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, grade, role, tier, engagement_score, experience_level, interests, avatar_url, created_at")
    .eq("id", idParsed.data)
    .eq("chapter_id", myProfile?.chapter_id)
    .single();

  if (!profile) return { error: "Member not found" };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: events } = await supabase
    .from("events")
    .select("id, date, start_time")
    .eq("chapter_id", myProfile.chapter_id)
    .gte("start_time", thirtyDaysAgo.toISOString())
    .order("start_time", { ascending: true });

  const { data: attendances } = await supabase
    .from("attendance")
    .select("event_id, attended")
    .eq("user_id", idParsed.data);

  const attendedSet = new Set(
    (attendances ?? [])
      .filter((a) => a.attended)
      .map((a) => a.event_id)
  );

  const byDate = new Map<string, { attended: number; total: number }>();
  for (const e of events ?? []) {
    const d = parseEventDateTime(e.start_time, e.date).toISOString().slice(0, 10);
    const cur = byDate.get(d) ?? { attended: 0, total: 0 };
    cur.total += 1;
    if (attendedSet.has(e.id)) cur.attended += 1;
    byDate.set(d, cur);
  }

  const attendanceHistory = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, attended: v.attended, total: v.total }));

  const { data: ep } = await supabase
    .from("engagement_points")
    .select("points, source")
    .eq("user_id", idParsed.data);

  const { data: mp } = await supabase
    .from("manual_points")
    .select("points")
    .eq("user_id", idParsed.data);

  const bySource: Record<string, number> = {};
  for (const r of ep ?? []) {
    const src = r.source ?? "other";
    bySource[src] = (bySource[src] ?? 0) + r.points;
  }
  const manualSum = (mp ?? []).reduce((s, r) => s + r.points, 0);
  if (manualSum > 0) bySource.manual_bonus = (bySource.manual_bonus ?? 0) + manualSum;

  const pointsBreakdown = Object.entries(bySource)
    .filter(([, v]) => v > 0)
    .map(([src, value]) => {
      const cat = POINT_CATEGORIES[src] ?? {
        label: src.replace(/_/g, " "),
        color: "#6B7280",
      };
      return { label: cat.label, value, color: cat.color };
    });

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      grade: profile.grade,
      role: profile.role,
      tier: profile.tier,
      engagement_score: profile.engagement_score,
      experience_level: profile.experience_level,
      interests: profile.interests as string[] | null,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
    },
    attendanceHistory,
    pointsBreakdown,
  };
}
