import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { AttendanceClient } from "./attendance-client";

export const metadata: Metadata = {
  title: "Attendance",
  description: "Mark attendance and manage event check-ins.",
};

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    redirect("/dashboard");
  }

  if (!profile?.chapter_id) redirect("/chapter-setup");

  const [
    { data: events },
    { data: members },
    { data: allAttendance },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("chapter_id", profile.chapter_id)
      .order("start_time", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("chapter_id", profile.chapter_id),
    supabase
      .from("attendance")
      .select("event_id, user_id, attended"),
  ]);

  const attendanceByEvent = (allAttendance ?? []).reduce(
    (acc, { event_id, user_id, attended }) => {
      if (!acc[event_id]) acc[event_id] = {};
      acc[event_id][user_id] = attended;
      return acc;
    },
    {} as Record<string, Record<string, boolean>>
  );

  // Only include events that have attendance recorded
  const eventsWithAttendance = (events ?? []).filter(
    (e) => attendanceByEvent[e.id] && Object.keys(attendanceByEvent[e.id]!).length > 0
  );

  const eventsWithStats = (events ?? []).map((e) => {
    const att = attendanceByEvent[e.id] ?? {};
    const present = Object.values(att).filter(Boolean).length;
    const total = members?.length ?? 0;
    return {
      ...e,
      present_count: present,
      total_members: total,
      attendance_map: att,
    };
  });

  // Filter to only events with stats for analytics (exclude upcoming/no-attendance)
  const eventsWithStatsForAnalytics = eventsWithStats.filter((e) =>
    eventsWithAttendance.some((ev) => ev.id === e.id)
  );

  const memberAttendanceRates = (members ?? []).map((m) => {
    const completedEventCount = eventsWithAttendance.length;
    const attended = eventsWithAttendance.filter(
      (e) => attendanceByEvent[e.id]?.[m.id] === true
    ).length;
    return {
      ...m,
      attended,
      total: completedEventCount,
      rate: completedEventCount > 0 ? (attended / completedEventCount) * 100 : 0,
    };
  });

  return (
    <AttendanceClient
      events={eventsWithStats}
      eventsForAnalytics={eventsWithStatsForAnalytics}
      members={members ?? []}
      memberRates={memberAttendanceRates}
    />
  );
}
