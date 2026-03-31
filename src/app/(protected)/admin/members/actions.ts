"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recalculateUserScore } from "@/lib/points";
import { isAdminRole } from "@/lib/roles";
import { parseActionInput } from "@/lib/security/parse-action";
import {
  awardPointsToMemberBodySchema,
  bulkAwardPointsBodySchema,
  memberUserIdParamSchema,
  updateMemberRoleBodySchema,
} from "@/lib/security/schemas";

export async function bulkAwardPoints(
  userIds: string[],
  points: number,
  reason: string
) {
  const validated = parseActionInput(bulkAwardPointsBodySchema, {
    userIds,
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

  const { userIds: idsToAward, points: pts, reason: rsn } = validated.data;

  let awardedCount = 0;
  for (const userId of idsToAward) {
    const { data: target } = await supabase
      .from("profiles")
      .select("chapter_id")
      .eq("id", userId)
      .single();
    if (target?.chapter_id !== profile.chapter_id) continue;

    const { error: mpError } = await supabase.from("manual_points").insert({
      user_id: userId,
      points: pts,
      reason: rsn.trim() || null,
      awarded_by: user.id,
    });
    if (mpError) return { error: mpError.message };
    const recalcErr = await recalculateUserScore(supabase, userId);
    if (recalcErr.error) return { error: recalcErr.error };
    awardedCount++;
  }

  if (awardedCount === 0)
    return { error: "No members could be awarded (verify selection is in your chapter)" };

  revalidatePath("/admin/members");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function awardPointsToMember(
  userId: string,
  points: number,
  reason: string
) {
  const validated = parseActionInput(awardPointsToMemberBodySchema, {
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

  revalidatePath("/admin/members");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function promoteToAdmin(userId: string) {
  return updateMemberRole(userId, "admin");
}

export async function demoteToMember(userId: string) {
  return updateMemberRole(userId, "member");
}

export async function updateMemberRole(
  userId: string,
  role: "admin" | "member"
) {
  const validated = parseActionInput(updateMemberRoleBodySchema, { userId, role });
  if (!validated.ok) return { error: validated.error };
  const { userId: uid, role: newRole } = validated.data;

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

  if (profile?.role !== "owner") return { error: "Only owners can change roles" };
  if (uid === user.id) return { error: "Cannot change your own role" };
  if (!profile?.chapter_id) return { error: "No chapter" };

  const { data: target } = await supabase
    .from("profiles")
    .select("chapter_id, role")
    .eq("id", uid)
    .single();

  if (target?.chapter_id !== profile.chapter_id)
    return { error: "User not in your chapter" };
  if (target?.role === "owner")
    return { error: "Cannot change the owner's role" };

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", uid);

  if (error) return { error: error.message };
  revalidatePath("/admin/members");
  return { success: true };
}

export async function removeFromChapter(userId: string) {
  const idParsed = parseActionInput(memberUserIdParamSchema, userId);
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

  if (profile?.role !== "owner") return { error: "Only owners can remove" };
  if (idParsed.data === user.id) return { error: "Cannot remove yourself" };

  const { data: target } = await supabase
    .from("profiles")
    .select("chapter_id")
    .eq("id", idParsed.data)
    .single();

  if (target?.chapter_id !== profile.chapter_id)
    return { error: "User not in your chapter" };

  const { error } = await supabase
    .from("profiles")
    .update({ chapter_id: null, role: "member" })
    .eq("id", idParsed.data);

  if (error) return { error: error.message };
  revalidatePath("/admin/members");
  return { success: true };
}
