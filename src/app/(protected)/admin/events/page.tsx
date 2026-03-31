import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { parseEventDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";
import { AdminEventsClient } from "./admin-events-client";

export const metadata: Metadata = {
  title: "Events",
  description: "Create and manage chapter events.",
};

export default async function AdminEventsPage() {
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

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("chapter_id", profile.chapter_id)
    .order("start_time", { ascending: false });

  const { data: attendanceCounts } = await supabase
    .from("attendance")
    .select("event_id, attended");

  const { count: memberCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", profile.chapter_id);

  const rsvpByEvent = (attendanceCounts ?? []).reduce(
    (acc, { event_id }) => {
      acc[event_id] = (acc[event_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const attendedByEvent = (attendanceCounts ?? [])
    .filter((a) => a.attended)
    .reduce(
      (acc, { event_id }) => {
        acc[event_id] = (acc[event_id] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const totalMembers = memberCount ?? 0;
  const now = new Date();

  const eventsWithCounts = (events ?? []).map((e) => {
    const eventDate = parseEventDateTime(e.start_time, e.date);
    const isPast = eventDate < now;
    const hasAttendance = (attendanceCounts ?? []).some((a) => a.event_id === e.id);
    let attendanceStatus: "needed" | "done" | "upcoming" = "upcoming";
    if (isPast) {
      attendanceStatus = hasAttendance ? "done" : "needed";
    }
    return {
      ...e,
      rsvp_count: rsvpByEvent[e.id] ?? 0,
      attended_count: attendedByEvent[e.id] ?? 0,
      total_members: totalMembers,
      attendance_status: attendanceStatus,
    };
  });

  return (
    <AdminEventsClient
      events={eventsWithCounts}
      userId={user.id}
    />
  );
}
