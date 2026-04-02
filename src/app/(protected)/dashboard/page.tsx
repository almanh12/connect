import type { Metadata } from "next";
import { parseEventDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMemberRecentActivity } from "@/lib/activity";
import { DashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your DECA chapter dashboard with events, announcements, and engagement.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[dashboard] Profile fetch error:", profileError.message);
  }
  if (!profile || !profile.chapter_id) {
    redirect("/chapter-setup");
  }

  const [
    { data: events, error: eventsErr },
    { data: announcements, error: annErr },
    { data: chapter },
    { data: competitionRegs },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("chapter_id", profile.chapter_id)
      .order("start_time", { ascending: true })
      .limit(100),
    supabase
      .from("announcements")
      .select("*")
      .eq("chapter_id", profile.chapter_id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("chapters")
      .select("name")
      .eq("id", profile.chapter_id)
      .single(),
    supabase
      .from("competition_registrations")
      .select("id, event_code, event_name, competition_level, status, partner_id")
      .eq("chapter_id", profile.chapter_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (eventsErr) console.warn("[dashboard] Events fetch failed:", eventsErr.message);
  if (annErr) console.warn("[dashboard] Announcements fetch failed:", annErr.message);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: attendedEvents } = await supabase
    .from("attendance")
    .select("event_id, checked_in_at")
    .eq("user_id", user.id)
    .eq("attended", true);

  const eventsAttendedThisMonth =
    attendedEvents?.filter((a) => {
      const event = (events ?? []).find((e) => e.id === a.event_id);
      return event && parseEventDateTime(event.start_time, event.date) >= startOfMonth;
    }).length ?? 0;

  const eventsList = events ?? [];
  const futureEvents = eventsList.filter(
    (e) => parseEventDateTime(e.start_time, e.date) >= now
  );
  const upcomingEvents = futureEvents.slice(0, 5);

  const announcementsList = announcements ?? [];
  const authorIds = [
    ...new Set(
      (announcementsList ?? [])
        .map((a) => a.user_id)
        .filter(Boolean) as string[]
    ),
  ];
  const { data: authorProfiles } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds)
      : { data: [] };
  const authorMap = new Map(
    (authorProfiles ?? []).map((p) => [p.id, p.full_name ?? "Officer"])
  );
  const announcementsWithAuthors = announcementsList.map((a) => ({
    ...a,
    author_name: a.user_id ? authorMap.get(a.user_id) ?? null : null,
  }));

  const recentActivity = await getMemberRecentActivity(
    supabase,
    user.id,
    profile.chapter_id
  );

  const { data: rankedMembers } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, engagement_score")
    .eq("chapter_id", profile.chapter_id)
    .order("engagement_score", { ascending: false });
  const membersList = rankedMembers ?? [];
  const userRank = membersList.findIndex((m) => m.id === user.id) + 1;
  const totalMembers = membersList.length;
  const topLeaderboard = membersList.slice(0, 5).map((m, i) => ({
    rank: i + 1,
    id: m.id,
    full_name: m.full_name ?? "Member",
    avatar_url: m.avatar_url ?? null,
    score: m.engagement_score ?? 0,
    isCurrentUser: m.id === user.id,
  }));

  const chapterName = chapter?.name ?? null;

  const memberIdToName = new Map(
    membersList.map((m) => [m.id, m.full_name ?? "Unknown"])
  );
  const myCompetitionRegs = (competitionRegs ?? []).map(
    (r: {
      id: string;
      event_code: string;
      event_name: string;
      competition_level: string;
      status: string;
      partner_id: string | null;
    }) => ({
      id: r.id,
      eventCode: r.event_code,
      eventName: r.event_name,
      competitionLevel: r.competition_level,
      status: r.status,
      partnerId: r.partner_id ?? null,
      partnerName: r.partner_id ? memberIdToName.get(r.partner_id) ?? null : null,
    })
  );

  return (
    <DashboardContent
      user={user}
      profile={profile}
      chapterName={chapterName}
      upcomingEvents={upcomingEvents}
      announcements={announcementsWithAuthors}
      eventsAttendedThisMonth={eventsAttendedThisMonth}
      userRank={userRank || totalMembers + 1}
      totalMembers={totalMembers}
      recentActivity={recentActivity}
      topLeaderboard={topLeaderboard}
      competitionRegistrations={myCompetitionRegs}
    />
  );
}
