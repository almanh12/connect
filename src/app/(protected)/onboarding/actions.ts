"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(data: {
  full_name: string;
  grade: number | null;
  experience_level: string | null;
  interests: string[] | null; // Ontario DECA event codes e.g. ['PBM', 'SEM', 'HTPS']
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[onboarding] Not authenticated");
    return { error: "Not authenticated" };
  }

  const updatePayload = {
    full_name: data.full_name.trim(),
    grade: data.grade,
    experience_level: data.experience_level,
    interests: data.interests && data.interests.length > 0 ? data.interests : null,
    onboarding_complete: true,
  };

  console.log("[onboarding] Updating profile for user:", user.id);
  console.log("[onboarding] Payload:", JSON.stringify(updatePayload, null, 2));

  const { data: result, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id)
    .select("id")
    .single();

  if (error) {
    console.error("[onboarding] Supabase error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    const friendlyMessage =
      error.code === "PGRST116" || error.message.includes("row")
        ? "Profile not found. Please try signing out and back in."
        : error.message.length > 80
          ? "Could not save profile. Please try again."
          : error.message;
    return { error: friendlyMessage };
  }

  console.log("[onboarding] Success, updated profile:", result);
  revalidatePath("/");
  return { success: true };
}
