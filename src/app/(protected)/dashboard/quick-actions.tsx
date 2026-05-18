"use client";

import Link from "next/link";
import {
  CalendarPlus,
  ClipboardCheck,
  Megaphone,
  Mic2,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  isOfficer: boolean;
  todayEventIds: string[];
}

export function QuickActions({ isOfficer, todayEventIds }: QuickActionsProps) {
  const checkInHref =
    todayEventIds.length > 0 ? `/checkin/${todayEventIds[0]}` : "/events";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild className="min-h-11">
        <Link href={checkInHref}>
          <ClipboardCheck className="h-4 w-4" />
          Check in
        </Link>
      </Button>
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/practice">
          <Mic2 className="h-4 w-4" />
          Practice
        </Link>
      </Button>
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/leaderboard">
          <Trophy className="h-4 w-4" />
          Leaderboard
        </Link>
      </Button>
      {isOfficer && (
        <>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/admin/events">
              <CalendarPlus className="h-4 w-4" />
              Create event
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/admin/announcements">
              <Megaphone className="h-4 w-4" />
              Announce
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
