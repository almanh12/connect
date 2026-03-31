"use client";

import { usePathname, useRouter } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import type { NotificationItem } from "@/lib/notifications";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { NotificationsDropdown } from "./notifications-dropdown";
import { UserDropdown } from "./user-dropdown";

interface AppShellProps {
  user: User;
  profile: Profile | null;
  notifications: NotificationItem[];
  chapterName?: string | null;
  requireChapter: boolean;
  requireOnboarding: boolean;
  children: React.ReactNode;
}

export function AppShell({
  user,
  profile,
  notifications,
  chapterName,
  requireChapter,
  requireOnboarding,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (requireChapter && !pathname?.startsWith("/chapter-setup") && !pathname?.startsWith("/join")) {
      router.replace("/chapter-setup");
      return;
    }
    // Do not send users to onboarding while they are still on chapter/join flows (e.g. entering invite code)
    if (
      requireOnboarding &&
      !pathname?.startsWith("/onboarding") &&
      !pathname?.startsWith("/chapter-setup") &&
      !pathname?.startsWith("/join")
    ) {
      router.replace("/onboarding");
      return;
    }
    // Redirect non-admins away from admin routes
    if (
      pathname?.startsWith("/admin") &&
      profile?.role !== "owner" &&
      profile?.role !== "admin" &&
      profile?.role !== "officer" &&
      profile?.role !== "advisor"
    ) {
      router.replace("/dashboard");
    }
  }, [requireChapter, requireOnboarding, pathname, router, profile?.role]);

  // Show minimal layout for chapter-setup, join, onboarding
  if (
    requireChapter ||
    pathname?.startsWith("/chapter-setup") ||
    pathname?.startsWith("/join") ||
    requireOnboarding ||
    pathname?.startsWith("/onboarding")
  ) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        {children}
      </div>
    );
  }

  const showAdmin =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "officer" ||
    profile?.role === "advisor";

  const isAiChat = pathname === "/ai-chat";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden bg-[#F8FAFC]">
      <Sidebar user={user} profile={profile} />
      <main className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto pt-14 sm:pt-16 lg:pt-0 ${isAiChat ? "pb-0" : "pb-20 md:pb-20 lg:pb-0"}`}>
        <TopBar user={user} profile={profile} notifications={notifications} chapterName={chapterName} />
        {isAiChat ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <PageTransition>{children}</PageTransition>
          </div>
        ) : (
          <div className="flex-1 px-4 py-8 overflow-x-hidden max-w-[1200px] mx-auto w-full md:px-6 lg:px-8">
            <PageTransition>{children}</PageTransition>
          </div>
        )}
      </main>
      <BottomNav showAdmin={showAdmin} />
    </div>
  );
}

function TopBar({
  user,
  profile,
  notifications,
  chapterName,
}: {
  user: User;
  profile: Profile | null;
  notifications: NotificationItem[];
  chapterName?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-end border-b border-[var(--gray-200)] bg-white/95 backdrop-blur-sm shadow-[var(--shadow-sm)]">
      <div className="flex flex-1 items-center justify-end gap-1 px-4 sm:px-6 max-w-[1200px] mx-auto w-full">
        <NotificationsDropdown notifications={notifications} />
        <UserDropdown user={user} profile={profile} chapterName={chapterName} />
      </div>
    </header>
  );
}
