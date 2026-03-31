import React from "react";
import { createClient } from "@/lib/supabase/server";
import { parseEventDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EditEventForm } from "../../edit-event-form";

export default async function EditEventPage({
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    profile?.role !== "owner" &&
    profile?.role !== "admin" &&
    profile?.role !== "officer" &&
    profile?.role !== "advisor"
  ) {
    redirect("/dashboard");
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) redirect("/admin/events");

  const startDate = parseEventDateTime(event.start_time, event.date);
  const endDate = parseEventDateTime(event.end_time, event.date);
  const dateStr =
    event.date ??
    (event.start_time.includes("T") ? event.start_time.slice(0, 10) : null) ??
    new Date().toISOString().slice(0, 10);
  const startHHMM = event.start_time.includes("T")
    ? startDate.toTimeString().slice(0, 5)
    : event.start_time.slice(0, 5);
  const endHHMM = event.end_time.includes("T")
    ? endDate.toTimeString().slice(0, 5)
    : event.end_time.slice(0, 5);

  const initialData = {
    title: event.title,
    description: event.description ?? "",
    event_type: event.event_type ?? "meeting",
    date: dateStr,
    start_time: startHHMM,
    end_time: endHHMM,
    location: event.location ?? "",
    virtual_link: event.virtual_link ?? "",
    is_mandatory: event.is_mandatory ?? false,
    max_capacity: event.max_capacity ?? undefined,
    recurring: !!event.recurrence_type,
    recurrence_type: event.recurrence_type ?? "weekly",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/events"
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
      </div>
      <EditEventForm eventId={id} initialData={initialData} />
    </div>
  );
}
