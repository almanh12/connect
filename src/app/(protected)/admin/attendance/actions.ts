"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { parseActionInput } from "@/lib/security/parse-action";
import {
  awardBonusPointsBodySchema,
  markAllAbsentBodySchema,
  markAttendanceBodySchema,
  saveBulkAttendanceBodySchema,
} from "@/lib/security/schemas";
import {
  ATTENDANCE_POINTS,
  awardPoints,
  recalculateUserScore,
} from "@/lib/points";

export async function markAttendance(
  eventId: string,
  userId: string,
  attended: boolean
) {
  const validated = parseActionInput(markAttendanceBodySchema, {
    eventId,
    userId,
    attended,
  });
  if (!validated.ok) return { error: validated.error };

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

  if (!profile || !isAdminRole(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { eventId: eid, userId: uid, attended: didAttend } = validated.data;

  const { data: event } = await supabase
    .from("events")
    .select("chapter_id, event_type, is_mandatory, start_time, attendance_marked")
    .eq("id", eid)
    .single();

  if (event?.chapter_id !== profile.chapter_id) return { error: "Unauthorized" };
  if (event?.attendance_marked) return { error: "Attendance is locked for this event" };

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("event_id", eid)
    .eq("user_id", uid)
    .maybeSingle();

  if (existing) {
    const { data: prev } = await supabase
      .from("attendance")
      .select("attended")
      .eq("id", existing.id)
      .single();
    const wasAlreadyAttended = prev?.attended ?? false;

    const { error } = await supabase
      .from("attendance")
      .update({
        attended: didAttend,
        checked_in_at: didAttend ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };

    if (didAttend && !wasAlreadyAttended && event) {
      await awardPoints(supabase, uid, ATTENDANCE_POINTS, "event_attendance", {
        description: "Attended event",
        referenceId: eid,
      });
      await recalculateUserScore(supabase, uid);
    }
  } else {
    const { error } = await supabase.from("attendance").insert({
      event_id: eid,
      user_id: uid,
      attended: didAttend,
      checked_in_at: didAttend ? new Date().toISOString() : null,
    });
    if (error) return { error: error.message };

    if (didAttend && event) {
      await awardPoints(supabase, uid, ATTENDANCE_POINTS, "event_attendance", {
        description: "Attended event",
        referenceId: eid,
      });
      await recalculateUserScore(supabase, uid);
    }
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Save bulk attendance: presentUserIds = members marked present. Upserts all records, awards +10 pts to each present member, locks event. */
export async function saveBulkAttendance(
  eventId: string,
  presentUserIds: string[]
) {
  const validated = parseActionInput(saveBulkAttendanceBodySchema, {
    eventId,
    presentUserIds,
  });
  if (!validated.ok) return { error: validated.error };

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

  if (!profile || !isAdminRole(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { eventId: eid, presentUserIds: presentIdsFromBody } = validated.data;

  const { data: event } = await supabase
    .from("events")
    .select("id, title, chapter_id, attendance_marked")
    .eq("id", eid)
    .single();

  if (!event || event.chapter_id !== profile.chapter_id)
    return { error: "Unauthorized" };
  if (event.attendance_marked)
    return { error: "Attendance is locked for this event" };

  const { data: members } = await supabase
    .from("profiles")
    .select("id")
    .eq("chapter_id", profile.chapter_id);

  const allMembers = members ?? [];
  const presentSet = new Set(presentIdsFromBody.map(String));

  // 1. Upsert attendance records for ALL members
  const records = allMembers.map((member) => ({
    event_id: eid,
    user_id: member.id,
    attended: presentSet.has(member.id),
    checked_in_at: presentSet.has(member.id) ? new Date().toISOString() : null,
  }));

  const { error: upsertErr } = await supabase
    .from("attendance")
    .upsert(records, { onConflict: "event_id,user_id" });

  if (upsertErr) {
    console.error("[saveBulkAttendance] attendance upsert failed:", upsertErr);
    return {
      error: `Failed to save attendance: ${upsertErr.message}. Ensure the attendance table exists with UNIQUE(event_id, user_id) and RLS allows officers to insert/update.`,
    };
  }

  // 2. Award 10 points to each PRESENT member via RPC (bypasses RLS)
  const presentIds = allMembers
    .filter((m) => presentSet.has(m.id))
    .map((m) => String(m.id));
  console.log("[saveBulkAttendance] presentIds before RPC:", presentIds);
  let awardedCount = 0;
  if (presentIds.length > 0) {
    const { data: awarded, error: pointsError } = await supabase.rpc(
      "award_attendance_points",
      { member_ids: presentIds, points_amount: 10 }
    );
    console.log("Points awarded to", awarded, "members. Error:", pointsError);
    awardedCount = typeof awarded === "number" ? awarded : 0;
    if (pointsError) {
      console.error("[saveBulkAttendance] award_attendance_points RPC failed:", pointsError);
    }
  }

  // 3. Mark event as attendance completed (lock)
  const { error: lockErr } = await supabase
    .from("events")
    .update({ attendance_marked: true })
    .eq("id", eid);

  if (lockErr) {
    console.error("[saveBulkAttendance] Failed to lock event:", lockErr);
    return { error: `Attendance saved but could not lock event: ${lockErr.message}` };
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true, awardedCount };
}

export async function markAllAbsent(eventId: string) {
  const validated = parseActionInput(markAllAbsentBodySchema, { eventId });
  if (!validated.ok) return { error: validated.error };

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

  if (!profile || !isAdminRole(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { eventId: eid } = validated.data;

  const { data: event } = await supabase
    .from("events")
    .select("chapter_id")
    .eq("id", eid)
    .single();

  if (event?.chapter_id !== profile.chapter_id)
    return { error: "Unauthorized" };

  const { data: members } = await supabase
    .from("profiles")
    .select("id")
    .eq("chapter_id", profile.chapter_id);

  for (const m of members ?? []) {
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("event_id", eid)
      .eq("user_id", m.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("attendance")
        .update({ attended: false, checked_in_at: null })
        .eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({
        event_id: eid,
        user_id: m.id,
        attended: false,
      });
    }
  }

  revalidatePath("/admin/attendance");
  return { success: true };
}

export async function awardBonusPoints(
  userId: string,
  points: number,
  reason: string
) {
  const validated = parseActionInput(awardBonusPointsBodySchema, {
    userId,
    points,
    reason,
  });
  if (!validated.ok) return { error: validated.error };

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

  if (!profile || !isAdminRole(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { userId: targetId, points: pts, reason: rsn } = validated.data;

  const { data: target } = await supabase
    .from("profiles")
    .select("chapter_id")
    .eq("id", targetId)
    .single();

  if (target?.chapter_id !== profile.chapter_id)
    return { error: "User not in your chapter" };

  const { error: mpError } = await supabase.from("manual_points").insert({
    user_id: targetId,
    points: pts,
    reason: rsn.trim() || null,
    awarded_by: user.id,
  });

  if (mpError) return { error: mpError.message };

  const { error: recalcError } = await recalculateUserScore(supabase, targetId);
  if (recalcError) return { error: recalcError };

  revalidatePath("/admin/attendance");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}
