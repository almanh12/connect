import type { SupabaseClient } from "@supabase/supabase-js";
import { parseEventDateTime } from "./utils";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
  isComputed?: boolean;
}

/** Compute all notifications from existing data — no notifications table required */
export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  chapterId: string | null,
  tier?: string | null
): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];

  try {
    if (tier && tier.toLowerCase() !== "bronze") {
      items.push({
        id: "engagement-milestone",
        type: "engagement_milestone",
        title: `You're at ${tier} tier!`,
        body: "Keep up the great work with your chapter engagement.",
        reference_id: null,
        read_at: null,
        created_at: new Date().toISOString(),
        isComputed: true,
      });
    }

    if (!chapterId) return items;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let announcements: { id: string; title: string; content: string | null; created_at: string }[] = [];
    let events: { id: string; title: string; date?: string | null; start_time: string; is_mandatory: boolean | null }[] = [];
    let attendances: { event_id: string }[] = [];

    const { data: annData, error: annErr } = await supabase
      .from("announcements")
      .select("id, title, content, created_at")
      .eq("chapter_id", chapterId)
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    if (annErr) {
      console.warn("[notifications] Announcements fetch failed:", annErr.message);
    } else {
      announcements = annData ?? [];
    }

    const { data: evData, error: evErr } = await supabase
      .from("events")
      .select("id, title, date, start_time, is_mandatory")
      .eq("chapter_id", chapterId)
      .gte("start_time", now.toISOString())
      .lte("start_time", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true });
    if (evErr) {
      console.warn("[notifications] Events fetch failed:", evErr.message);
    } else {
      events = evData ?? [];
    }

    const { data: attData, error: attErr } = await supabase
      .from("attendance")
      .select("event_id")
      .eq("user_id", userId);
    if (attErr) {
      console.warn("[notifications] Attendance fetch failed:", attErr.message);
    } else {
      attendances = attData ?? [];
    }

    // "Marked present" notifications — admin-verified attendance
    const { data: presentData } = await supabase
      .from("attendance")
      .select("event_id, checked_in_at, updated_at")
      .eq("user_id", userId)
      .eq("attended", true)
      .gte("updated_at", weekAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(5);

    if (presentData?.length && chapterId) {
      const eventIds = [...new Set(presentData.map((a) => a.event_id))];
      const { data: evts } = await supabase
        .from("events")
        .select("id, title")
        .in("id", eventIds);
      const eventMap = new Map((evts ?? []).map((e) => [e.id, e.title]));

      for (const a of presentData) {
        const at = a.checked_in_at ?? a.updated_at ?? "";
        if (!at) continue;
        const eventTitle = eventMap.get(a.event_id) ?? "Event";
        items.push({
          id: `attendance-${a.event_id}-${at}`,
          type: "attendance",
          title: "You were marked present",
          body: `"${eventTitle}" (+10 pts)`,
          reference_id: a.event_id,
          read_at: null,
          created_at: at,
          isComputed: true,
        });
      }
    }

    for (const a of announcements) {
      items.push({
        id: `announcement-${a.id}`,
        type: "announcement",
        title: a.title,
        body: a.content?.slice(0, 200) ?? null,
        reference_id: a.id,
        read_at: null,
        created_at: a.created_at,
        isComputed: true,
      });
    }

    const rsvpIds = new Set(attendances.map((a) => a.event_id));
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const seenEventIds = new Set<string>();
    for (const e of events) {
    const eventDate = parseEventDateTime(e.start_time, e.date);
    const isTomorrow =
      eventDate >= tomorrowStart && eventDate <= tomorrowEnd;
    const isMandatory = e.is_mandatory ?? false;

    if (isTomorrow && rsvpIds.has(e.id) && !seenEventIds.has(e.id)) {
      seenEventIds.add(e.id);
      items.push({
        id: `event-reminder-${e.id}`,
        type: "event_reminder",
        title: "Event tomorrow",
        body: e.title,
        reference_id: e.id,
        read_at: null,
        created_at: e.start_time,
        isComputed: true,
      });
    }
    if (
      isMandatory &&
      eventDate <= weekEnd &&
      eventDate >= now &&
      !seenEventIds.has(e.id)
    ) {
      seenEventIds.add(e.id);
      items.push({
        id: `mandatory-${e.id}`,
        type: "mandatory_event",
        title: "Mandatory event coming up",
        body: e.title,
        reference_id: e.id,
        read_at: null,
        created_at: e.start_time,
        isComputed: true,
      });
    }
    }

    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return items.slice(0, 15);
  } catch (err) {
    console.error("Notifications fetch error:", err);
    return [];
  }
}
