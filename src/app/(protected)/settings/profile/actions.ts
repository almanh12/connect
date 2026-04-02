"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { profileUpdateBodySchema } from "@/lib/security/schemas";

const isDev = process.env.NODE_ENV === "development";

function logDeleteAccountDev(context: string, err: unknown) {
  if (!isDev) return;
  if (err && typeof err === "object" && "message" in err) {
    console.error(`[deleteAccount][dev] ${context}:`, (err as { message?: string }).message, err);
  } else {
    console.error(`[deleteAccount][dev] ${context}:`, err);
  }
}

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

  let admin;
  try {
    admin = createAdminClient();
  } catch (adminErr) {
    console.error("[deleteAccount] Admin client failed:", adminErr);
    logDeleteAccountDev("createAdminClient", adminErr);
    return {
      error:
        "Could not initialize server admin client. Ensure server environment is configured.",
    };
  }

  try {
    // --- Clear FKs that block auth.users deletion (e.g. manual_points.awarded_by has no ON DELETE CASCADE) ---
    const { error: strategiesErr } = await admin
      .from("strategies")
      .update({ assigned_to: null })
      .eq("assigned_to", userId);
    if (strategiesErr) {
      console.error("[deleteAccount] strategies update error:", strategiesErr);
      logDeleteAccountDev("strategies", strategiesErr);
    }

    const { error: mpAwarderErr } = await admin
      .from("manual_points")
      .update({ awarded_by: null })
      .eq("awarded_by", userId);
    if (mpAwarderErr) {
      console.error("[deleteAccount] manual_points awarded_by null error:", mpAwarderErr);
      logDeleteAccountDev("manual_points.awarded_by", mpAwarderErr);
    }

    const { error: partnerErr } = await admin
      .from("competition_registrations")
      .update({ partner_id: null })
      .eq("partner_id", userId);
    if (partnerErr) {
      console.error("[deleteAccount] competition_registrations partner_id null error:", partnerErr);
      logDeleteAccountDev("competition_registrations.partner_id", partnerErr);
    }

    const { error: compDelErr } = await admin
      .from("competition_registrations")
      .delete()
      .eq("user_id", userId);
    if (compDelErr) {
      console.error("[deleteAccount] competition_registrations delete error:", compDelErr);
      logDeleteAccountDev("competition_registrations.delete", compDelErr);
    }

    // --- User-owned rows (explicit deletes; auth CASCADE also covers many of these) ---
    const { error: chatErr } = await admin.from("chat_messages").delete().eq("user_id", userId);
    if (chatErr) {
      console.error("[deleteAccount] chat_messages delete error:", chatErr);
      logDeleteAccountDev("chat_messages", chatErr);
    }

    const { error: convErr } = await admin.from("conversations").delete().eq("user_id", userId);
    if (convErr) {
      console.error("[deleteAccount] conversations delete error:", convErr);
      logDeleteAccountDev("conversations", convErr);
    }

    const { error: practiceErr } = await admin.from("practice_sessions").delete().eq("user_id", userId);
    if (practiceErr) {
      console.error("[deleteAccount] practice_sessions delete error:", practiceErr);
      logDeleteAccountDev("practice_sessions", practiceErr);
    }

    const { error: attErr } = await admin.from("attendance").delete().eq("user_id", userId);
    if (attErr) {
      console.error("[deleteAccount] attendance delete error:", attErr);
      logDeleteAccountDev("attendance", attErr);
    }

    const { error: epErr } = await admin.from("engagement_points").delete().eq("user_id", userId);
    if (epErr) {
      console.error("[deleteAccount] engagement_points delete error:", epErr);
      logDeleteAccountDev("engagement_points", epErr);
    }

    const { error: mpErr } = await admin.from("manual_points").delete().eq("user_id", userId);
    if (mpErr) {
      console.error("[deleteAccount] manual_points delete error:", mpErr);
      logDeleteAccountDev("manual_points", mpErr);
    }

    const { error: apiErr } = await admin.from("api_usage").delete().eq("user_id", userId);
    if (apiErr) {
      console.error("[deleteAccount] api_usage delete error:", apiErr);
      logDeleteAccountDev("api_usage", apiErr);
    }

    const { error: notifErr } = await admin.from("notifications").delete().eq("user_id", userId);
    if (notifErr) {
      console.error("[deleteAccount] notifications delete error:", notifErr);
      logDeleteAccountDev("notifications", notifErr);
    }

    const { error: aiStratErr } = await admin.from("ai_strategies").delete().eq("user_id", userId);
    if (aiStratErr) {
      console.error("[deleteAccount] ai_strategies delete error:", aiStratErr);
      logDeleteAccountDev("ai_strategies", aiStratErr);
    }

    // Remove auth user — CASCADE deletes public.profiles when profiles.id references auth.users(id) ON DELETE CASCADE
    const { error: authError } = await admin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("[deleteAccount] Auth delete error:", authError);
      console.error("[deleteAccount] Auth error message:", authError.message);
      logDeleteAccountDev("auth.admin.deleteUser", authError);
      return { error: "Could not delete account. Please contact support." };
    }

    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn("[deleteAccount] signOut after delete:", signOutErr);
      logDeleteAccountDev("signOut", signOutErr);
    }

    console.log("[deleteAccount] Successfully deleted account for userId:", userId);
    return { success: true };
  } catch (err) {
    console.error("[deleteAccount] Unexpected error:", err);
    logDeleteAccountDev("catch", err);
    if (err instanceof Error && err.stack) {
      console.error("[deleteAccount] Error stack:", err.stack);
    }
    try {
      console.error(
        "[deleteAccount] Full error (serialized):",
        JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}))
      );
    } catch {
      console.error("[deleteAccount] Could not serialize error (possibly circular)");
    }
    return { error: "Could not delete account. Please try again." };
  }
}
