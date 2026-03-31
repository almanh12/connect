"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { parseActionInput } from "@/lib/security/parse-action";
import {
  createEventBodySchema,
  eventIdParamSchema,
  manualCheckInBodySchema,
  recurringGroupIdParamSchema,
  updateEventPartialSchema,
} from "@/lib/security/schemas";

function getRecurrenceEndDate(
  startDate: string,
  until: "month" | "semester" | "custom",
  customEnd?: string
): string {
  const d = new Date(startDate);
  if (until === "custom" && customEnd?.trim()) return customEnd.slice(0, 10);
  if (until === "month") {
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  }
  if (until === "semester") {
    const m = d.getMonth();
    if (m >= 0 && m <= 4) return `${d.getFullYear()}-05-31`;
    return `${d.getFullYear()}-12-31`;
  }
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

/** Generate recurrence dates using date-only arithmetic to avoid timezone shifts */
function generateRecurrenceDates(
  startDate: string,
  endDate: string,
  type: "weekly" | "biweekly" | "monthly"
): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const end = new Date(ey, em - 1, ed);
  let current = new Date(sy, sm - 1, sd);

  while (current <= end) {
    dates.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
    );
    if (type === "monthly") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + (type === "weekly" ? 7 : 14));
    }
  }
  return dates;
}
import { revalidatePath } from "next/cache";
import {
  ATTENDANCE_POINTS,
  awardPoints,
  recalculateUserScore,
} from "@/lib/points";

export type CreateEventInput = {
  title: string;
  description: string;
  event_type: string;
  date: string;
  start_time: string;
  end_time: string;
  /** ISO timestamps (client-computed from local time) — used when provided to avoid timezone shift */
  start_timestamp?: string;
  end_timestamp?: string;
  location: string;
  virtual_link?: string;
  is_mandatory: boolean;
  max_capacity?: number;
  recurring: boolean;
  recurrence_type?: string;
  recurrence_until?: "month" | "semester" | "custom";
  recurrence_end?: string;
};

export async function createEvent(input: CreateEventInput) {
  const parsed = parseActionInput(createEventBodySchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    return { error: "Unauthorized" };
  }

  const v = parsed.data;

  // Validate end > start (form sends date YYYY-MM-DD and times HH:MM)
  const startTime = new Date(`${v.date}T${v.start_time}`);
  const endTime = new Date(`${v.date}T${v.end_time}`);
  if (endTime <= startTime)
    return { error: "End time must be after start time" };

  if (!profile?.chapter_id) return { error: "No chapter" };

  // Use client-provided ISO timestamps (local time → UTC) when available to avoid timezone shift.
  // Otherwise fall back to date+time (server may interpret as UTC).
  const dateOnly = v.date.slice(0, 10);
  const startHHMM = v.start_time.length >= 5 ? v.start_time.slice(0, 5) : v.start_time;
  const endHHMM = v.end_time.length >= 5 ? v.end_time.slice(0, 5) : v.end_time;
  const startTimestamp = v.start_timestamp ?? `${dateOnly}T${startHHMM}:00`;
  const endTimestamp = v.end_timestamp ?? `${dateOnly}T${endHHMM}:00`;

  const basePayload: Record<string, unknown> = {
    chapter_id: profile.chapter_id,
    title: v.title.trim(),
    description: v.description?.trim() || null,
    event_type: v.event_type,
    start_time: startTimestamp,
    end_time: endTimestamp,
    location: v.location?.trim() || null,
    virtual_link: v.virtual_link?.trim() || null,
    is_mandatory: v.is_mandatory,
    max_capacity: v.max_capacity ?? null,
    created_by: user.id,
  };

  const recurrenceType = v.recurring ? v.recurrence_type ?? null : null;

  if (v.recurring && recurrenceType) {
    const endDate = getRecurrenceEndDate(
      v.date,
      v.recurrence_until ?? "month",
      v.recurrence_end
    );
    const dates = generateRecurrenceDates(
      v.date,
      endDate,
      recurrenceType as "weekly" | "biweekly" | "monthly"
    );
    const recurringGroupId = randomUUID();
    // For recurring: use UTC time from first event's timestamps, apply to each date
    const utcStartTime = startTimestamp.includes("T")
      ? startTimestamp.split("T")[1]?.slice(0, 8) ?? `${startHHMM}:00`
      : `${startHHMM}:00`;
    const utcEndTime = endTimestamp.includes("T")
      ? endTimestamp.split("T")[1]?.slice(0, 8) ?? `${endHHMM}:00`
      : `${endHHMM}:00`;
    const rows = dates.map((d) => ({
      ...basePayload,
      date: d,
      start_time: `${d}T${utcStartTime}Z`,
      end_time: `${d}T${utcEndTime}Z`,
      recurrence_type: recurrenceType,
      recurrence_end: endDate,
      is_recurring: true,
      recurring_group_id: recurringGroupId,
    }));
    const { error } = await supabase.from("events").insert(rows);
    if (error) return { error: error.message };
  } else {
    const insertPayload: Record<string, unknown> = {
      ...basePayload,
      date: dateOnly,
      recurrence_type: null,
      recurrence_end: null,
      is_recurring: false,
    };
    const { error } = await supabase.from("events").insert(insertPayload);
    if (error) return { error: error.message };
  }
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  return { success: true };
}

export async function deleteEvent(eventId: string) {
  const idParsed = parseActionInput(eventIdParamSchema, eventId);
  if (!idParsed.ok) return { error: idParsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role) || !profile?.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("chapter_id")
    .eq("id", idParsed.data)
    .single();

  if (!eventRow || eventRow.chapter_id !== profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("event_id", idParsed.data);

  if (error) return { error: error.message };

  const { error: eventError } = await supabase
    .from("events")
    .delete()
    .eq("id", idParsed.data);

  if (eventError) return { error: eventError.message };
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath(`/events/${idParsed.data}`);
  return { success: true };
}

/** Delete all events in a recurring series */
export async function deleteEventSeries(recurringGroupId: string) {
  const gidParsed = parseActionInput(recurringGroupIdParamSchema, recurringGroupId);
  if (!gidParsed.ok) return { error: gidParsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role) || !profile?.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { data: seriesRow } = await supabase
    .from("events")
    .select("chapter_id")
    .eq("recurring_group_id", gidParsed.data)
    .limit(1)
    .maybeSingle();

  if (!seriesRow || seriesRow.chapter_id !== profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("recurring_group_id", gidParsed.data);

  const eventIds = (events ?? []).map((e) => e.id);
  for (const eid of eventIds) {
    await supabase.from("attendance").delete().eq("event_id", eid);
  }
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("recurring_group_id", gidParsed.data);

  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  return { success: true };
}

/** Update all events in a recurring series (shared fields + time applied per date) */
export async function updateEventSeries(
  recurringGroupId: string,
  input: Partial<CreateEventInput>
) {
  const gidParsed = parseActionInput(recurringGroupIdParamSchema, recurringGroupId);
  if (!gidParsed.ok) return { error: gidParsed.error };
  const inputParsed = parseActionInput(updateEventPartialSchema, input);
  if (!inputParsed.ok) return { error: inputParsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role) || !profile?.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { data: seriesRow } = await supabase
    .from("events")
    .select("chapter_id")
    .eq("recurring_group_id", gidParsed.data)
    .limit(1)
    .maybeSingle();

  if (!seriesRow || seriesRow.chapter_id !== profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const patch = inputParsed.data;

  const { data: events } = await supabase
    .from("events")
    .select("id, date, start_time, end_time")
    .eq("recurring_group_id", gidParsed.data);

  if (!events?.length) return { error: "No events in series" };

  const baseUpdates: Record<string, unknown> = {};
  if (patch.title !== undefined) baseUpdates.title = patch.title.trim();
  if (patch.description !== undefined)
    baseUpdates.description = patch.description?.trim() || null;
  if (patch.event_type !== undefined) baseUpdates.event_type = patch.event_type;
  if (patch.location !== undefined)
    baseUpdates.location = patch.location?.trim() || null;
  if (patch.virtual_link !== undefined)
    baseUpdates.virtual_link = patch.virtual_link?.trim() || null;
  if (patch.is_mandatory !== undefined) baseUpdates.is_mandatory = patch.is_mandatory;
  if (patch.max_capacity !== undefined)
    baseUpdates.max_capacity = patch.max_capacity ?? null;

  const startHHMM =
    patch.start_time && patch.start_time.length >= 5
      ? patch.start_time.slice(0, 5)
      : null;
  const endHHMM =
    patch.end_time && patch.end_time.length >= 5 ? patch.end_time.slice(0, 5) : null;

  for (const ev of events) {
    const updates = { ...baseUpdates };
    const dateOnly = ev.date?.slice(0, 10) ?? ev.start_time?.slice(0, 10);
    if (dateOnly && (patch.start_timestamp || startHHMM) && (patch.end_timestamp || endHHMM)) {
      updates.start_time = patch.start_timestamp
        ? patch.start_timestamp.replace(/^\d{4}-\d{2}-\d{2}/, dateOnly)
        : `${dateOnly}T${startHHMM}:00`;
      updates.end_time = patch.end_timestamp
        ? patch.end_timestamp.replace(/^\d{4}-\d{2}-\d{2}/, dateOnly)
        : `${dateOnly}T${endHHMM}:00`;
    }
    const { error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", ev.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  return { success: true };
}

export async function updateEvent(
  eventId: string,
  input: Partial<CreateEventInput>
) {
  const idParsed = parseActionInput(eventIdParamSchema, eventId);
  if (!idParsed.ok) return { error: idParsed.error };
  const inputParsed = parseActionInput(updateEventPartialSchema, input);
  if (!inputParsed.ok) return { error: inputParsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role) || !profile?.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("chapter_id")
    .eq("id", idParsed.data)
    .single();

  if (!eventRow || eventRow.chapter_id !== profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const patch = inputParsed.data;

  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.description !== undefined)
    updates.description = patch.description?.trim() || null;
  if (patch.event_type !== undefined) updates.event_type = patch.event_type;
  if (patch.location !== undefined)
    updates.location = patch.location?.trim() || null;
  if (patch.virtual_link !== undefined)
    updates.virtual_link = patch.virtual_link?.trim() || null;
  if (patch.is_mandatory !== undefined) updates.is_mandatory = patch.is_mandatory;
  if (patch.max_capacity !== undefined)
    updates.max_capacity = patch.max_capacity ?? null;
  if (patch.recurring !== undefined)
    updates.recurrence_type = patch.recurring ? patch.recurrence_type ?? null : null;

  if (patch.date && patch.start_time && patch.end_time) {
    const startTime = new Date(`${patch.date}T${patch.start_time}`);
    const endTime = new Date(`${patch.date}T${patch.end_time}`);
    if (endTime <= startTime) return { error: "End time must be after start time" };
    const dateOnly = patch.date.slice(0, 10);
    const startHHMM = patch.start_time.length >= 5 ? patch.start_time.slice(0, 5) : patch.start_time;
    const endHHMM = patch.end_time.length >= 5 ? patch.end_time.slice(0, 5) : patch.end_time;
    updates.date = dateOnly;
    updates.start_time = patch.start_timestamp ?? `${dateOnly}T${startHHMM}:00`;
    updates.end_time = patch.end_timestamp ?? `${dateOnly}T${endHHMM}:00`;
  }

  const { error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", idParsed.data);

  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath(`/events/${idParsed.data}`);
  return { success: true };
}

export async function manualCheckIn(attendanceId: string, eventId: string) {
  const parsed = parseActionInput(manualCheckInBodySchema, {
    attendanceId,
    eventId,
  });
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role) || !profile?.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { data: ev } = await supabase
    .from("events")
    .select("chapter_id")
    .eq("id", parsed.data.eventId)
    .single();

  if (!ev || ev.chapter_id !== profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { data: att } = await supabase
    .from("attendance")
    .select("user_id, event_id")
    .eq("id", parsed.data.attendanceId)
    .single();

  if (!att || att.event_id !== parsed.data.eventId) {
    return { error: "Invalid attendance record" };
  }

  if (att?.user_id) {
    await awardPoints(supabase, att.user_id, ATTENDANCE_POINTS, "event_attendance", {
      description: "Attended event",
      referenceId: parsed.data.eventId,
    });
    await recalculateUserScore(supabase, att.user_id);
  }

  const { error } = await supabase
    .from("attendance")
    .update({
      attended: true,
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.attendanceId);

  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}


export async function checkInViaUrl(eventId: string, userId: string) {
  const supabase = await createClient();

  const { data: attendance } = await supabase
    .from("attendance")
    .select("id, attended")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!attendance) return { error: "No RSVP found for this event" };
  if (attendance.attended) return { error: "Already checked in", success: false, points: 0 };

  await awardPoints(supabase, userId, ATTENDANCE_POINTS, "event_attendance", {
    description: "Checked in via QR/link",
    referenceId: eventId,
  });
  await recalculateUserScore(supabase, userId);

  const { error } = await supabase
    .from("attendance")
    .update({
      attended: true,
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", attendance.id);

  if (error) return { error: error.message, success: false };
  revalidatePath("/checkin");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/leaderboard");
  return { success: true, points: ATTENDANCE_POINTS };
}
