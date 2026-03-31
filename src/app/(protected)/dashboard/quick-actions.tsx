"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  Mic2,
  Trophy,
  CalendarPlus,
  Megaphone,
} from "lucide-react";

interface QuickActionsProps {
  isOfficer: boolean;
  todayEventIds: string[];
}

export function QuickActions({ isOfficer, todayEventIds }: QuickActionsProps) {
  const checkInHref =
    todayEventIds.length > 0 ? `/checkin/${todayEventIds[0]}` : "/events";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={checkInHref}
        className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--deca-blue)] px-4 py-2.5 h-10 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--deca-blue-dark)] active:bg-[var(--deca-blue-deeper)]"
      >
        <ClipboardCheck className="h-4 w-4" />
        Check in
      </Link>
      <Link
        href="/practice"
        className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3.5 py-2 h-10 text-sm font-medium text-[var(--gray-700)] shadow-[var(--shadow-card)] transition hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)]"
      >
        <Mic2 className="h-4 w-4" />
        Practice
      </Link>
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3.5 py-2 h-10 text-sm font-medium text-[var(--gray-700)] shadow-[var(--shadow-card)] transition hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)]"
      >
        <Trophy className="h-4 w-4" />
        Leaderboard
      </Link>
      {isOfficer && (
        <>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3.5 py-2 h-10 text-sm font-medium text-[var(--gray-600)] shadow-[var(--shadow-card)] transition hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)]"
          >
            <CalendarPlus className="h-4 w-4" />
            Create event
          </Link>
          <Link
            href="/admin/announcements"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3.5 py-2 h-10 text-sm font-medium text-[var(--gray-600)] shadow-[var(--shadow-card)] transition hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)]"
          >
            <Megaphone className="h-4 w-4" />
            Announce
          </Link>
        </>
      )}
    </div>
  );
}
