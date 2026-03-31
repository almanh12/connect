import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { getNotifications } from "@/lib/notifications";
import { AppShell } from "./app-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profileData: Profile | null = null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[layout] Profile fetch error:", profileError.message, profileError.code);
  }
  profileData = profile as Profile | null;

  const hasChapter = !!profileData?.chapter_id;
  const isOnboardingComplete = profileData?.onboarding_complete ?? false;

  let chapterName: string | null = null;
  if (profileData?.chapter_id) {
    const { data: chapter } = await supabase
      .from("chapters")
      .select("name")
      .eq("id", profileData.chapter_id)
      .single();
    chapterName = chapter?.name ?? null;
  }

  let notifications: Awaited<ReturnType<typeof getNotifications>> = [];
  try {
    notifications =
      hasChapter && isOnboardingComplete
        ? await getNotifications(
            supabase,
            user.id,
            profileData?.chapter_id ?? null,
            profileData?.tier ?? null
          )
        : [];
  } catch (notifErr) {
    console.warn("[layout] Notifications fetch failed:", notifErr);
  }

  return (
    <AppShell
      user={user}
      profile={profileData}
      notifications={notifications}
      chapterName={chapterName}
      requireChapter={!hasChapter}
      requireOnboarding={hasChapter && !isOnboardingComplete}
    >
      {children}
    </AppShell>
  );
}
