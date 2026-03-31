"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calendar, Trophy, MessageSquare, MoreHorizontal, Shield, Users, ClipboardCheck, Settings, LogOut, Mic2 } from "lucide-react";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/ai-chat", label: "Chat", icon: MessageSquare },
];

const ADMIN_MORE_ITEMS = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck },
];

interface BottomNavProps {
  showAdmin?: boolean;
}

export function BottomNav({ showAdmin = false }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    setMoreOpen(false);
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/[0.08] bg-[var(--deca-blue-dark)] py-2 md:hidden safe-area-pb">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-all duration-200 ${
                isActive
                  ? "text-white"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-all duration-200 ${
            pathname?.startsWith("/admin") || pathname?.startsWith("/settings")
              ? "text-white"
              : "text-white/80 hover:text-white hover:bg-white/10"
          }`}
          aria-label="More"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className="h-5 w-5 shrink-0" />
          <span>More</span>
        </button>
      </nav>

      {/* More slide-up menu */}
      {moreOpen &&
        createPortal(
          <>
            <div
              className="md:hidden"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 99998,
              }}
              onClick={() => setMoreOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl animate-fade-in-up"
              style={{ zIndex: 99999 }}
            >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
              <h3 className="text-lg font-semibold text-gray-900">More</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>
            <div className="p-4 pb-8 safe-area-pb">
              <div className="mb-4">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Activities</p>
                <Link
                  href="/practice"
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-gray-900 hover:bg-gray-50"
                >
                  <Mic2 className="h-5 w-5 text-[var(--deca-blue)]" />
                  <span className="font-medium">Practice</span>
                </Link>
              </div>
              {showAdmin && (
                <div className="mb-4">
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Admin</p>
                  <div className="space-y-1">
                    {ADMIN_MORE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-gray-900 hover:bg-gray-50"
                      >
                        <item.icon className="h-5 w-5 text-[var(--deca-blue)]" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Account</p>
                <div className="space-y-1">
                  <Link
                    href="/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-gray-900 hover:bg-gray-50"
                  >
                    <Settings className="h-5 w-5 text-[var(--deca-blue)]" />
                    <span className="font-medium">Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
          </>,
          document.body
        )}
    </>
  );
}
