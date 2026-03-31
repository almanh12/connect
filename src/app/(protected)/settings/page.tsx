import type { Metadata } from "next";
import Link from "next/link";
import { User, Bell, LogOut } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account and preferences.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <div className="space-y-3">
        <Link
          href="/settings/profile"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 transition hover:border-[#0171BB]/30 hover:bg-slate-50/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0171BB]/10">
            <User className="h-5 w-5 text-[#0171BB]" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Profile Settings</p>
            <p className="text-sm text-slate-500">
              Edit your name, grade, events, and more
            </p>
          </div>
        </Link>
        <Link
          href="/settings/notifications"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 transition hover:border-[#0171BB]/30 hover:bg-slate-50/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0171BB]/10">
            <Bell className="h-5 w-5 text-[#0171BB]" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Notification Preferences</p>
            <p className="text-sm text-gray-500">
              Choose which notifications to receive
            </p>
          </div>
        </Link>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <LogOut className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Sign Out</p>
              <p className="text-sm text-slate-500">
                Sign out of your account on this device
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
