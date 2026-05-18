import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventsClient } from "@/app/(protected)/events/events-client";

export const metadata: Metadata = {
  title: "Events",
  description: "View and manage your DECA chapter events.",
};

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("chapter_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.chapter_id) redirect("/chapter-setup");

  const isAdmin =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "officer" ||
    profile?.role === "advisor";

  const [eventsRes, attendanceRes, userRsvpRes, memberCountRes, registrationsRes, chapterMembersRes] =
    await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("chapter_id", profile.chapter_id)
      .order("start_time", { ascending: true })
      .limit(200),
    isAdmin
      ? supabase.from("attendance").select("event_id, attended")
      : { data: [] as { event_id: string; attended: boolean }[] },
    supabase.from("attendance").select("event_id").eq("user_id", user.id),
    isAdmin
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("chapter_id", profile.chapter_id)
      : { count: 0 },
    supabase
      .from("competition_registrations")
      .select("id, user_id, event_code, event_name, competition_level, status, partner_id, created_at")
      .eq("chapter_id", profile.chapter_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("chapter_id", profile.chapter_id),
  ]);

  const events = eventsRes.data ?? [];
  const allAttendance = attendanceRes.data ?? [];
  const attendedByEvent = allAttendance
    .filter((a) => a.attended)
    .reduce(
      (acc, { event_id }) => {
        acc[event_id] = (acc[event_id] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  const hasAttendanceByEvent = allAttendance.reduce(
    (acc, { event_id }) => {
      acc[event_id] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
  const totalMembers = (memberCountRes as { count?: number })?.count ?? 0;

  const registrations = registrationsRes.error ? [] : (registrationsRes.data ?? []);
  if (registrationsRes.error) {
    console.warn(
      "[events] Competition registrations fetch failed:",
      registrationsRes.error.message
    );
  }
  const chapterMembers =
    (chapterMembersRes as { data?: { id: string; full_name: string | null }[] })?.data ?? [];

  const rsvpEventIds = (userRsvpRes.data ?? []).map((r) => r.event_id);

  const eventsWithMeta = events.map((e) => ({
    ...e,
    attended_count: attendedByEvent[e.id] ?? 0,
    total_members: totalMembers,
    has_attendance_marked: !!hasAttendanceByEvent[e.id],
  }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <EventsClient
        events={eventsWithMeta}
        isAdmin={isAdmin}
        userId={user.id}
        rsvpEventIds={rsvpEventIds}
        competitionRegistrations={(registrations as { id: string; user_id: string; event_code: string; event_name: string; competition_level: string; status: string; partner_id: string | null; created_at: string }[]).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          event_code: r.event_code,
          event_name: r.event_name,
          competition_level: r.competition_level,
          status: r.status,
          partner_id: r.partner_id,
          created_at: r.created_at,
        }))}
        chapterMembers={chapterMembers}
      />
    </div>
  );
}
