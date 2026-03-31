import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityItem =
  | { type: "attendance"; name: string; eventTitle: string; at: string }
  | { type: "new_event"; title: string; at: string }
  | { type: "points"; points: number; at: string }
  | { type: "announcement"; title: string; at: string };

export async function getRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  chapterId: string
): Promise<ActivityItem[]> {
  const eventIds = await supabase
    .from("events")
    .select("id")
    .eq("chapter_id", chapterId)
    .then((r) => (r.data ?? []).map((e) => e.id));

  const [
    { data: attendances },
    { data: points },
    { data: newEvents },
    { data: announcements },
  ] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from("attendance")
          .select("event_id, user_id, checked_in_at")
          .eq("attended", true)
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null)
          .order("checked_in_at", { ascending: false })
          .limit(15)
      : { data: [] },
    supabase
      .from("engagement_points")
      .select("points, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("events")
      .select("id, title, created_at")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("announcements")
      .select("id, title, created_at")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items: ActivityItem[] = [];
  const seen = new Set<string>();

  const add = (key: string, item: ActivityItem) => {
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  if (attendances?.length) {
    const userIds = [...new Set(attendances.map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Member"]));
    const { data: evts } = await supabase
      .from("events")
      .select("id, title")
      .in("id", [...new Set(attendances.map((a) => a.event_id))]);
    const eventMap = new Map((evts ?? []).map((e) => [e.id, e.title]));

    for (const a of attendances) {
      const at = a.checked_in_at ?? "";
      if (!at) continue;
      const name = profileMap.get(a.user_id) ?? "Someone";
      const eventTitle = eventMap.get(a.event_id) ?? "Event";
      add(`att-${a.event_id}-${a.user_id}-${at}`, {
        type: "attendance",
        name,
        eventTitle,
        at,
      });
    }
  }

  for (const p of points ?? []) {
    add(`ep-${p.created_at}-${p.points}`, {
      type: "points",
      points: p.points,
      at: p.created_at,
    });
  }

  for (const e of newEvents ?? []) {
    add(`ev-${e.id}`, {
      type: "new_event",
      title: e.title,
      at: e.created_at,
    });
  }

  for (const a of announcements ?? []) {
    add(`an-${a.id}`, {
      type: "announcement",
      title: a.title,
      at: a.created_at,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 10);
}

/** Member dashboard: attendance + practice for this user only */
export type MemberActivityItem =
  | { type: "attendance"; eventTitle: string; points: number; at: string }
  | { type: "practice"; eventCode: string; score: number; points: number; at: string };

export async function getMemberRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  chapterId: string
): Promise<MemberActivityItem[]> {
  const eventIds = await supabase
    .from("events")
    .select("id")
    .eq("chapter_id", chapterId)
    .then((r) => (r.data ?? []).map((e) => e.id));

  const [
    { data: attendances },
    { data: practiceSessions },
  ] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from("attendance")
          .select("event_id, checked_in_at, updated_at")
          .eq("user_id", userId)
          .eq("attended", true)
          .in("event_id", eventIds)
          .order("updated_at", { ascending: false })
          .limit(10)
      : { data: [] },
    supabase
      .from("practice_sessions")
      .select("event_code, event_category, score, created_at")
      .eq("user_id", userId)
      .not("score", "is", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items: MemberActivityItem[] = [];

  if (attendances?.length) {
    const { data: evts } = await supabase
      .from("events")
      .select("id, title")
      .in("id", [...new Set(attendances.map((a) => a.event_id))]);
    const eventMap = new Map((evts ?? []).map((e) => [e.id, e.title]));

    for (const a of attendances) {
      const at = a.checked_in_at ?? (a as { updated_at?: string }).updated_at ?? "";
      if (!at) continue;
      const eventTitle = eventMap.get(a.event_id) ?? "Event";
      items.push({
        type: "attendance",
        eventTitle,
        points: 10,
        at,
      });
    }
  }

  for (const p of practiceSessions ?? []) {
    items.push({
      type: "practice",
      eventCode: p.event_code ?? p.event_category ?? "Practice",
      score: p.score ?? 0,
      points: 5,
      at: p.created_at,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 10);
}
