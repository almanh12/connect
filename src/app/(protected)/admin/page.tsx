import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { OverviewClient } from "./overview-client";

export const metadata: Metadata = {
  title: "Overview",
  description: "Manage your chapter at a glance.",
};

type ActivityItem =
  | { type: "member_join"; name: string; at: string }
  | { type: "event_create"; title: string; at: string }
  | { type: "announcement"; title: string; at: string };

async function getRecentActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chapterId: string
): Promise<ActivityItem[]> {
  const [profilesRes, eventsRes, announcementsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, created_at")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("title, created_at")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("announcements")
      .select("title, created_at")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const items: ActivityItem[] = [];
  for (const p of profilesRes.data ?? []) {
    items.push({
      type: "member_join",
      name: p.full_name ?? "A member",
      at: p.created_at,
    });
  }
  for (const e of eventsRes.data ?? []) {
    items.push({ type: "event_create", title: e.title, at: e.created_at });
  }
  for (const a of announcementsRes.data ?? []) {
    items.push({ type: "announcement", title: a.title, at: a.created_at });
  }
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 5);
}

export default async function OverviewPage() {
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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    { data: chapter },
    { count: memberCount },
    { data: events },
    { data: announcements },
    { data: attendances },
    { data: chapterMembers },
    { data: allEvents },
    activityItems,
    { data: competitionRegs },
  ] = await Promise.all([
    supabase.from("chapters").select("*").eq("id", profile.chapter_id).single(),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("chapter_id", profile.chapter_id),
    supabase
      .from("events")
      .select("id, start_time")
      .eq("chapter_id", profile.chapter_id)
      .gte("start_time", startOfMonth.toISOString()),
    supabase
      .from("announcements")
      .select("id")
      .eq("chapter_id", profile.chapter_id)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("attendance")
      .select("event_id, attended")
      .eq("attended", true),
    supabase
      .from("profiles")
      .select("id")
      .eq("chapter_id", profile.chapter_id),
    supabase
      .from("events")
      .select("id, title, date, start_time")
      .eq("chapter_id", profile.chapter_id)
      .lte("start_time", now.toISOString())
      .order("start_time", { ascending: false })
      .limit(20),
    getRecentActivity(supabase, profile.chapter_id),
    supabase
      .from("competition_registrations")
      .select("user_id")
      .eq("chapter_id", profile.chapter_id),
  ]);

  // Events that need attendance: past/today, no attendance records yet
  const { data: attendanceByEvent } = await supabase
    .from("attendance")
    .select("event_id")
    .not("event_id", "is", null);

  const eventIdsWithAttendance = new Set(
    (attendanceByEvent ?? []).map((a) => a.event_id)
  );

  const eventsNeedingAttendance = (allEvents ?? []).filter(
    (e) => !eventIdsWithAttendance.has(e.id)
  );

  if (!chapter) redirect("/dashboard");

  const eventsThisMonth = events?.length ?? 0;
  const announcementsThisMonth = announcements?.length ?? 0;
  const totalMembers = chapterMembers?.length ?? 1;
  const competitorIds = new Set(
    (competitionRegs ?? []).map((r: { user_id: string }) => r.user_id)
  );
  const competitorCount = competitorIds.size;

  // Avg attendance: only count events where attendance has been taken
  const completedEventCount = eventIdsWithAttendance.size;
  const totalAttendedForCompleted =
    (attendances ?? []).filter((a) => eventIdsWithAttendance.has(a.event_id))
      .length;
  const totalPossibleForCompleted = completedEventCount * totalMembers || 1;
  const avgAttendanceRate =
    completedEventCount > 0
      ? Math.round((totalAttendedForCompleted / totalPossibleForCompleted) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        description="Manage your chapter at a glance."
        compact
        className="mb-4"
      />
      <OverviewClient
        eventsNeedingAttendance={eventsNeedingAttendance}
        chapter={chapter}
        canEdit={profile.role === "owner"}
        memberCount={memberCount ?? 0}
        eventsThisMonth={eventsThisMonth}
        announcementsThisMonth={announcementsThisMonth}
        avgAttendanceRate={avgAttendanceRate}
        activityItems={activityItems}
        competitorCount={competitorCount}
      />
    </div>
  );
}
