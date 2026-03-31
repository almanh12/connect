"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/avatar";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";

interface UserDropdownProps {
  user: SupabaseUser;
  profile: Profile | null;
  chapterName?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  officer: "Admin",
  advisor: "Admin",
  member: "Member",
};

export function UserDropdown({
  user,
  profile,
  chapterName,
}: UserDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName =
    profile?.full_name || user.email?.split("@")[0] || "User";
  const email = user.email ?? "";
  const role = profile?.role ?? "member";
  const isOfficer =
    role === "owner" || role === "admin" || role === "officer" || role === "advisor";

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast.error("Failed to sign out");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-100/80"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <Avatar
          src={profile?.avatar_url}
          name={displayName}
          size="sm"
          ringClassName="ring-2 ring-[var(--deca-blue)]/30"
        />
        <span className="hidden text-sm font-medium text-[var(--gray-900)] sm:inline">
          {displayName}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="animate-dropdown-enter absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-xl border border-slate-200/80 bg-white py-2 shadow-card-hover"
          role="menu"
        >
          <div className="px-4 py-3">
            <p className="font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-sm text-slate-500">{email}</p>
            <p className="mt-1 text-xs font-medium text-[var(--deca-blue)]">
              {ROLE_LABELS[role] ?? role}
            </p>
            {chapterName && (
              <p className="mt-0.5 text-xs text-gray-500">{chapterName}</p>
            )}
          </div>
          <div className="my-2 border-t border-slate-100" />
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              role="menuitem"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              role="menuitem"
            >
              <User className="h-4 w-4" />
              Profile Settings
            </Link>
            {isOfficer && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                role="menuitem"
              >
                <Shield className="h-4 w-4" />
                Overview
              </Link>
            )}
            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              role="menuitem"
            >
              <Bell className="h-4 w-4" />
              Notification Preferences
            </Link>
          </div>
          <div className="my-2 border-t border-gray-100" />
          <div className="py-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
