"use client";

import { format } from "date-fns";
import { formatTierForDisplay } from "@/lib/points";
import { parseEventDateTime } from "@/lib/utils";
import Link from "next/link";
import { Calendar } from "lucide-react";
import type { Profile } from "@/lib/types";
import type { Event } from "@/lib/types";
import type { EarnedBadge } from "@/lib/badges";

interface DashboardSidebarProps {
  profile: Profile | null;
  upcomingEvents: Event[];
  eventsAttendedThisMonth: number;
  currentStreak: number;
  earnedBadges: EarnedBadge[];
}

export function DashboardSidebar({
  profile,
  upcomingEvents,
  eventsAttendedThisMonth,
  currentStreak,
  earnedBadges,
}: DashboardSidebarProps) {
  const score = profile?.engagement_score ?? 0;
  const displayTier = profile?.tier ?? "bronze";

  return (
    <aside className="space-y-4">
      {/* Engagement Score */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Engagement score</h3>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900 font-gotham">{score}</span>
          <span className="text-sm text-slate-500">pts</span>
        </div>
        <div className="mt-2">
          <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            {formatTierForDisplay(displayTier)}
          </span>
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Badges</h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {earnedBadges.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                title={b.description}
              >
                <span>{b.icon}</span>
                <span>{b.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Upcoming</h3>
        <ul className="mt-2.5 space-y-2.5">
          {upcomingEvents.length === 0 ? (
            <li className="text-sm text-slate-500">No upcoming events</li>
          ) : (
            upcomingEvents.slice(0, 3).map((event) => (
              <li key={event.id} className="border-l-2 border-[#0171BB] pl-3">
                <Link
                  href={`/events?id=${event.id}`}
                  className="block text-sm font-medium text-slate-900 hover:text-[#0171BB] transition-colors"
                >
                  {event.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {format(parseEventDateTime(event.start_time, event.date), "EEE, MMM d · h:mm a")}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Quick Stats */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">This month</h3>
        <div className="mt-2.5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xl font-bold text-slate-900 font-gotham">{eventsAttendedThisMonth}</p>
            <p className="text-xs text-slate-500">Events attended</p>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 font-gotham">{currentStreak}</p>
            <p className="text-xs text-slate-500">Day streak</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
