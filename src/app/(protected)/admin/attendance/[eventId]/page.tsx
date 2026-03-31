import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import { MarkAttendanceClient } from "./mark-attendance-client";

export const metadata: Metadata = {
  title: "Mark Attendance",
  description: "Mark attendance for chapter members.",
};

export default async function MarkAttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
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

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("chapter_id", profile.chapter_id)
    .single();

  if (eventError || !event) notFound();

  const attendanceLocked = !!(event.attendance_marked ?? event.attendance_submitted_at);

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, grade, avatar_url")
    .eq("chapter_id", profile.chapter_id)
    .order("full_name");

  const { data: existingAttendance } = await supabase
    .from("attendance")
    .select("user_id, attended")
    .eq("event_id", eventId);

  const attendanceMap = new Map(
    (existingAttendance ?? []).map((a) => [a.user_id, a.attended])
  );

  const initialChecked = new Set(
    (existingAttendance ?? [])
      .filter((a) => a.attended)
      .map((a) => a.user_id)
  );

  const hasExistingAttendance = !!(existingAttendance && existingAttendance.length > 0);

  return (
    <MarkAttendanceClient
      event={event}
      members={members ?? []}
      initialChecked={initialChecked}
      hasExistingAttendance={hasExistingAttendance}
      attendanceLocked={attendanceLocked}
    />
  );
}
