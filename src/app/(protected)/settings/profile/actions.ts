"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { profileUpdateBodySchema } from "@/lib/security/schemas";

export async function updateProfile(data: {
  full_name: string;
  grade: number | null;
  experience_level: string | null;
  interests: string[] | null;
}) {
  const parsed = profileUpdateBodySchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid profile data" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: v.full_name,
      grade: v.grade,
      experience_level: v.experience_level,
      interests: v.interests && v.interests.length > 0 ? v.interests : null,
    })
    .eq("id", user.id);

  if (error) {
    return {
      error:
        error.message.length > 80
          ? "Could not save profile. Please try again."
          : error.message,
    };
  }

  revalidatePath("/");
  revalidatePath("/settings/profile");
  return { success: true };
}

export async function deleteAccount(): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = user.id;

  // 1. Check if user is chapter Owner — block deletion
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "owner") {
    return {
      error:
        "As the chapter Owner, you must transfer ownership to another admin before deleting your account.",
    };
  }

  // 2. Use admin client for full cleanup (bypasses RLS) — service role key must exist only in server env
  let admin;
  try {
    admin = createAdminClient();
  } catch (adminErr) {
    console.error("[deleteAccount] Admin client failed:", adminErr);
    return {
      error:
        "Could not initialize server admin client. Ensure server environment is configured.",
    };
  }

  try {
    // Order matters: respect FK constraints and child→parent relationships
    // Unassign strategies (don't delete — just remove assignment)
    const { error: strategiesErr } = await admin
      .from("strategies")
      .update({ assigned_to: null })
      .eq("assigned_to", userId);
    if (strategiesErr) {
      console.error("[deleteAccount] strategies update error:", strategiesErr);
    }

    // Delete chat messages (by user_id catches all, including legacy orphaned)
    const { error: chatErr } = await admin.from("chat_messages").delete().eq("user_id", userId);
    if (chatErr) console.error("[deleteAccount] chat_messages delete error:", chatErr);

    // Delete conversations
    const { error: convErr } = await admin.from("conversations").delete().eq("user_id", userId);
    if (convErr) console.error("[deleteAccount] conversations delete error:", convErr);

    // Delete practice sessions
    const { error: practiceErr } = await admin.from("practice_sessions").delete().eq("user_id", userId);
    if (practiceErr) console.error("[deleteAccount] practice_sessions delete error:", practiceErr);

    // Delete attendance
    const { error: attErr } = await admin.from("attendance").delete().eq("user_id", userId);
    if (attErr) console.error("[deleteAccount] attendance delete error:", attErr);

    // Delete points/score history (tables may not exist in all deployments)
    const { error: epErr } = await admin.from("engagement_points").delete().eq("user_id", userId);
    if (epErr) console.error("[deleteAccount] engagement_points delete error:", epErr);

    const { error: mpErr } = await admin.from("manual_points").delete().eq("user_id", userId);
    if (mpErr) console.error("[deleteAccount] manual_points delete error:", mpErr);

    // Delete API usage
    const { error: apiErr } = await admin.from("api_usage").delete().eq("user_id", userId);
    if (apiErr) console.error("[deleteAccount] api_usage delete error:", apiErr);

    // Delete notifications
    const { error: notifErr } = await admin.from("notifications").delete().eq("user_id", userId);
    if (notifErr) console.error("[deleteAccount] notifications delete error:", notifErr);

    // Delete profile
    const { error: profileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("[deleteAccount] Profile delete error:", profileError);
      console.error("[deleteAccount] Profile error code:", profileError.code);
      console.error("[deleteAccount] Profile error message:", profileError.message);
      console.error("[deleteAccount] Profile error details:", profileError.details);
      return { error: "Could not delete account. Please contact support." };
    }

    // Delete auth user (prevents sign-in and ghost profile)
    const { error: authError } = await admin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("[deleteAccount] Auth delete error:", authError);
      console.error("[deleteAccount] Auth error name:", authError.name);
      console.error("[deleteAccount] Auth error message:", authError.message);
      return {
        error:
          "Profile was removed but auth deletion failed. Please contact support.",
      };
    }

    // Sign out the current session (in case auth delete didn't clear it)
    await supabase.auth.signOut();

    console.log("[deleteAccount] Successfully deleted account for userId:", userId);
    return { success: true };
  } catch (err) {
    console.error("[deleteAccount] Unexpected error:", err);
    console.error("[deleteAccount] Error type:", err instanceof Error ? err.constructor?.name : typeof err);
    console.error("[deleteAccount] Error message:", err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error("[deleteAccount] Error stack:", err.stack);
    }
    try {
      console.error("[deleteAccount] Full error (serialized):", JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})));
    } catch {
      console.error("[deleteAccount] Could not serialize error (possibly circular)");
    }
    return { error: "Could not delete account. Please try again." };
  }
}
