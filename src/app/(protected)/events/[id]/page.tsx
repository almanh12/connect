import React from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EventDetailClient } from "./event-detail-client";

export const metadata: Metadata = {
  title: "Event",
  description: "View event details.",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
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

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("chapter_id", profile.chapter_id)
    .single();

  if (!event) notFound();

  const [
    { data: attendances },
    { data: attendeeProfiles },
  ] = await Promise.all([
    supabase
      .from("attendance")
      .select("user_id, attended, checked_in_at")
      .eq("event_id", id),
    supabase
      .from("attendance")
      .select("user_id")
      .eq("event_id", id)
      .then(async (r) => {
        const ids = [...new Set((r.data ?? []).map((a) => a.user_id))];
        if (ids.length === 0) return { data: [] };
        return supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ids);
      }),
  ]);

  const attendedCount = attendances?.filter((a) => a.attended).length ?? 0;

  const attendees = (attendances ?? [])
    .map((a) => {
      const p = (attendeeProfiles ?? []).find((pr) => pr.id === a.user_id);
      return {
        id: a.user_id,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        attended: a.attended,
      };
    })
    .sort((a, b) => (a.attended ? -1 : 1) - (b.attended ? -1 : 1));

  const isOfficer =
    profile.role === "owner" || profile.role === "admin" || profile.role === "officer" || profile.role === "advisor";

  return (
    <EventDetailClient
      event={event}
      userId={user.id}
      attendedCount={attendedCount}
      attendees={attendees}
      isOfficer={isOfficer}
    />
  );
}
