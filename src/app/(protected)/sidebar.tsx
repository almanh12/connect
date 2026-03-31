"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { SidebarLogo } from "@/components/sidebar-logo";
import { usePathname, useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  MessageSquare,
  LayoutGrid,
  Users,
  ClipboardCheck,
  Sparkles,
  FileText,
  BarChart3,
  Megaphone,
  Mic2,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/practice", label: "Practice", icon: Mic2 },
  { href: "/ai-chat", label: "AI Chat", icon: MessageSquare },
];

const ADMIN_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/strategies", label: "Strategies", icon: Sparkles },
  { href: "/admin/content", label: "Content Generator", icon: FileText },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

const SIDEBAR_COLLAPSED_KEY = "deca_sidebar_collapsed";

export function Sidebar({ user, profile }: { user: SupabaseUser; profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setCollapsed(stored === "true");
    setMounted(true);
  }, []);

  // Use collapsed only after mount — ensures server and initial client render match (no hydration mismatch)
  const isCollapsed = mounted ? collapsed : false;

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const showAdmin =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "officer" ||
    profile?.role === "advisor";

  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "Member";

  return (
    <>
    <aside
      className={`
        hidden md:flex fixed left-0 z-40
        bg-[#10243E] border-r border-white/[0.08]
        transition-all duration-200 ease-in-out
        ${isCollapsed ? "md:w-[72px] lg:w-[72px]" : "md:w-[260px] lg:w-[260px]"}
      `}
      style={{
        fontFamily: "'Gotham Light', sans-serif",
        top: "var(--disclaimer-banner-height, 0px)",
        height: "calc(100dvh - var(--disclaimer-banner-height, 0px))",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Child 1: Logo area */}
      <div className={`pt-4 bg-[#10243E] ${isCollapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between"}`}>
          <div className={`flex justify-center min-w-0 ${isCollapsed ? "order-2" : "flex-1"}`}>
            <SidebarLogo collapsed={isCollapsed} />
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-colors duration-150 lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="h-px bg-white/[0.08] mt-4" />
      </div>

      {/* Child 2: Nav area — no individual scroll, flows with sidebar */}
      <div className={`py-4 ${isCollapsed ? "px-2" : ""}`}>
        {isCollapsed ? (
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center justify-center h-10 rounded-[var(--radius-sm)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] px-2
                      ${isActive
                        ? "bg-[#0472B0] text-white"
                        : "text-white/65 hover:bg-white/[0.06] hover:text-white/85"}
                    `}
                    title={item.label}
                  >
                    <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
                  </Link>
                </li>
              );
            })}
            {showAdmin &&
              ADMIN_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center justify-center h-10 rounded-[var(--radius-sm)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] px-2
                        ${isActive
                          ? "bg-[#0472B0] text-white"
                          : "text-white/65 hover:bg-white/[0.06] hover:text-white/85"}
                      `}
                      title={item.label}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
                    </Link>
                  </li>
                );
              })}
          </ul>
        ) : (
          <ul className="space-y-0">
            {/* MEMBER section */}
            <li className="px-3 pt-0 pb-2 mt-6 first:mt-0">
              <p className="font-gotham-regular text-[10px] font-medium uppercase tracking-[0.06em] text-white/35">
                Member
              </p>
            </li>
            <li className="mx-3 mb-4">
              <div
                className="rounded-2xl p-2"
                style={{ background: "rgba(255,255,255,0.95)" }}
              >
                <div className="space-y-0.5">
                  {NAV_ITEMS.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          sidebar-nav-item relative flex items-center gap-3 w-full rounded-[10px] py-2.5 px-3.5 text-[14px] font-normal
                          ${isActive
                            ? "bg-[#0472B0] text-white font-semibold"
                            : "bg-transparent text-[#1a2332] hover:bg-black/[0.04]"}
                        `}
                        title={item.label}
                      >
                        <item.icon
                          className="h-5 w-5 shrink-0 text-inherit"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </li>
            {/* ADMIN section */}
            {showAdmin && (
              <>
                <li className="px-3 pt-6 pb-2">
                  <p className="font-gotham-regular text-[10px] font-medium uppercase tracking-[0.06em] text-white/35">
                    Admin
                  </p>
                </li>
                <li className="mx-3 mb-0">
                  <div
                    className="rounded-2xl p-2"
                    style={{ background: "rgba(255,255,255,0.95)" }}
                  >
                    <div className="space-y-0.5">
                      {ADMIN_ITEMS.map((item) => {
                        const isActive =
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`
                              sidebar-nav-item relative flex items-center gap-3 w-full rounded-[10px] py-2.5 px-3.5 text-[14px] font-normal
                              ${isActive
                                ? "bg-[#0472B0] text-white font-semibold"
                                : "bg-transparent text-[#1a2332] hover:bg-black/[0.04]"}
                            `}
                            title={item.label}
                          >
                            <item.icon
                              className="h-5 w-5 shrink-0 text-inherit"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </li>
              </>
            )}
          </ul>
        )}
      </div>

      {/* Child 3: Account section — at the end, scroll down to see */}
      <div className={`border-t border-white/[0.08] pt-4 pb-3 bg-[#10243E] ${isCollapsed ? "p-2" : "px-3"}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <Avatar
            src={profile?.avatar_url}
            name={displayName}
            size={36}
            fallbackBg="bg-[var(--deca-blue)]"
            className="text-white font-bold shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{displayName}</p>
              <p className="truncate text-[11px] text-[var(--deca-blue-muted)] capitalize">
                {profile?.role === "officer" || profile?.role === "advisor" ? "Admin" : (profile?.role ?? "member")}
              </p>
            </div>
          )}
        </div>
        <div className={`mt-2 space-y-0.5 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
          <Link
            href="/settings/profile"
            className={`flex items-center gap-2 rounded-[var(--radius-sm)] py-1.5 text-[13px] text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors duration-150 ${isCollapsed ? "justify-center px-2" : "px-3"}`}
            title="Profile Settings"
          >
            <User className="h-4 w-4 shrink-0" />
            {!isCollapsed && "Profile"}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] py-1.5 text-[13px] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors duration-150 ${isCollapsed ? "justify-center px-2" : "px-3"}`}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      </div>
    </aside>
    {/* Spacer so main content doesn't go under fixed sidebar */}
    <div
      className={`hidden md:block shrink-0 transition-all duration-200 ${isCollapsed ? "w-[72px]" : "w-[260px]"}`}
      aria-hidden
    />
    </>
  );
}
