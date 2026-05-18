"use client";

import { useCallback, useState, useRef } from "react";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { navigationProgress } from "@/lib/navigation-progress";
import Link from "next/link";
import { format, differenceInDays, startOfDay } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Profile, Event } from "@/lib/types";
import type { AnnouncementWithAuthor } from "./announcements-feed";
import type { MemberActivityItem } from "@/lib/activity";
import { getEventByCode, isTeamEvent } from "@/lib/ontario-deca-data";
import { LEVEL_COLORS, formatLevelDisplay } from "@/lib/competition-levels";
import { EngagementRing } from "./engagement-ring";
import { ErrorBoundary } from "@/components/error-boundary";
import { getTier, formatTierForDisplay } from "@/lib/points";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronRight,
  Calendar,
  Check,
  Pencil,
  Trophy,
  MessageSquare,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PanelCard } from "@/components/ui/panel-card";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardQuickActionsGrid } from "./dashboard-quick-actions";
import { EventRow } from "./event-row";
import { LeaderboardRow } from "./leaderboard-row";

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: "Meeting",
  mcq_practice: "MCQ Practice",
  roleplay_practice: "Roleplay",
  competition: "Competition",
  social: "Social",
  optional: "Optional",
};

export interface LeaderboardEntry {
  rank: number;
  id: string;
  full_name: string;
  avatar_url: string | null;
  score: number;
  isCurrentUser: boolean;
}

export interface CompetitionRegistrationDisplay {
  id: string;
  eventCode: string;
  eventName: string;
  competitionLevel: string;
  status: string;
  partnerId?: string | null;
  partnerName?: string | null;
}

interface DashboardContentProps {
  user: SupabaseUser;
  profile: Profile | null;
  chapterName: string | null;
  upcomingEvents: Event[];
  announcements: AnnouncementWithAuthor[];
  eventsAttendedThisMonth: number;
  userRank: number;
  totalMembers: number;
  recentActivity: MemberActivityItem[];
  topLeaderboard?: LeaderboardEntry[];
  competitionRegistrations?: CompetitionRegistrationDisplay[];
}

const STATUS_BADGE: Record<
  string,
  "secondary" | "success" | "default" | "destructive"
> = {
  registered: "secondary",
  confirmed: "success",
  completed: "default",
  withdrawn: "destructive",
};

export function DashboardContent({
  user,
  profile,
  chapterName,
  upcomingEvents,
  announcements,
  eventsAttendedThisMonth,
  userRank,
  totalMembers,
  recentActivity,
  topLeaderboard = [],
  competitionRegistrations = [],
}: DashboardContentProps) {
  const router = useProgressRouter();
  const [pullStart, setPullStart] = useState(0);
  const [pullY, setPullY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPullStart = useCallback((e: React.TouchEvent) => {
    const atTop = typeof window !== "undefined" && window.scrollY <= 10;
    if (atTop) {
      setPullStart(e.touches[0].clientY);
      setPullY(0);
    } else {
      setPullStart(0);
    }
  }, []);

  const onPullMove = useCallback((e: React.TouchEvent) => {
    if (pullStart === 0) return;
    const y = e.touches[0].clientY - pullStart;
    if (y > 0) setPullY(Math.min(y, 80));
  }, [pullStart]);

  const onPullEnd = useCallback(() => {
    if (pullY > 60) {
      navigationProgress.start();
      router.refresh();
    }
    setPullStart(0);
    setPullY(0);
  }, [pullY, router]);

  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "Member";
  const score = profile?.engagement_score ?? 0;
  const isOfficer =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "officer" ||
    profile?.role === "advisor";

  const now = new Date();

  const streakLine =
    eventsAttendedThisMonth > 0
      ? `You've attended ${eventsAttendedThisMonth} event${eventsAttendedThisMonth === 1 ? "" : "s"} this month — keep it up!`
      : "Attend your next event to start earning points!";

  const displayAnnouncements = announcements.slice(0, 2);

  return (
    <div
      ref={containerRef}
      className="dashboard-page relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-[var(--gray-50)]"
      onTouchStart={onPullStart}
      onTouchMove={onPullMove}
      onTouchEnd={onPullEnd}
    >
      {pullY > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
          style={{ height: pullY }}
          aria-hidden
        >
          <div className="mt-2 h-1 w-12 rounded-full bg-[var(--deca-blue)] opacity-80" />
        </div>
      )}
      {/* ROW 1 — Welcome Banner */}
      <div className="hero-banner-v2 w-full mb-4">
        <div className="hero-bg-overlay hero-bg-vignette-left" aria-hidden />
        <div className="hero-inner relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 px-6 sm:px-8 py-12 lg:py-14">
          <div className="hero-left flex-1 min-w-0 lg:pl-2">
            {chapterName && (
              <p className="hero-chapter-v2">{chapterName} Chapter</p>
            )}
            <h1 className="hero-welcome-v2">Welcome back, {displayName}</h1>
            <p className="hero-date-v2">{format(now, "EEEE, MMMM d, yyyy")}</p>
            <div className="hero-pill-wrap flex justify-center lg:justify-start text-center lg:text-left">
              <span className="hero-status-pill">{streakLine}</span>
            </div>
          </div>
          <div className="hero-right flex-shrink-0 flex justify-center lg:justify-end">
            <EngagementRing score={score} />
          </div>
        </div>
      </div>

      {/* ROW 2 — Stats + Announcements (+ optional My Competition Events) */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 mb-4">
        {/* Left: 2 stat cards */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            metric={`#${userRank} of ${totalMembers}`}
            label="Rank"
            icon={Trophy}
            accentColor="blue"
          />
          <StatCard
            metric={String(eventsAttendedThisMonth)}
            label="Events Attended This Month"
            icon={Calendar}
            accentColor="success"
          />
        </div>
        {/* Right: Compact Announcements */}
        <PanelCard
          title="Announcements"
          accentBorder
          accentColor="warning"
          accentSide="left"
          className="!p-4"
          rightAction={
            isOfficer ? (
              <Link
                href="/admin/announcements"
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Post
              </Link>
            ) : undefined
          }
        >
          <ErrorBoundary variant="section">
            {displayAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <ul className="space-y-2">
                {displayAnnouncements.map((ann) => (
                  <li key={ann.id}>
                    <Link
                      href="/announcements"
                      className="-mx-1 block rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {ann.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ErrorBoundary>
        </PanelCard>
      </div>

      {/* My Competition Events — shown when member has registrations */}
      {competitionRegistrations.length > 0 && (
        <div className="mb-4">
          <PanelCard
            title="My Competition Events"
            accentBorder
            accentColor="gold"
            accentSide="left"
            className="h-full"
          >
            <ul className="divide-y divide-[var(--gray-200)]">
              {competitionRegistrations.slice(0, 4).map((reg) => (
                <li key={reg.id} className="py-2 first:pt-0 last:pb-0">
                  <Link
                    href="/events?tab=competition"
                    className="block rounded-md py-1 -mx-1 px-1 hover:bg-[var(--gray-50)]"
                  >
                    <p className="text-sm font-medium text-[var(--gray-900)]">
                      {reg.eventName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${LEVEL_COLORS[reg.competitionLevel?.toLowerCase() ?? "regional"]}20`,
                          color: LEVEL_COLORS[reg.competitionLevel?.toLowerCase() ?? "regional"] ?? "#2563eb",
                        }}
                      >
                        {formatLevelDisplay(reg.competitionLevel)}
                      </span>
                      <span className="text-[11px] text-[var(--gray-500)]">
                        {reg.eventCode}
                      </span>
                      {reg.partnerName ? (
                        <span className="text-[11px] text-[var(--gray-600)]">
                          Partner: {reg.partnerName}
                        </span>
                      ) : (
                        (() => {
                          const event = getEventByCode(reg.eventCode);
                          const isTeam = event ? isTeamEvent(event) : false;
                          if (isTeam) return <span className="text-[11px] font-medium text-amber-600">No partner assigned</span>;
                          return <span className="text-[11px] text-[var(--gray-500)]">Individual</span>;
                        })()
                      )}
                      <Badge
                        variant={
                          STATUS_BADGE[reg.status?.toLowerCase() ?? "registered"] ??
                          "secondary"
                        }
                        className="text-[10px]"
                      >
                        {reg.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/events?tab=competition"
              className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-[var(--deca-blue)] hover:underline"
            >
              Manage registrations
              <ChevronRight className="h-4 w-4" />
            </Link>
          </PanelCard>
        </div>
      )}

      {/* ROW 3 — 2x2 CSS grid: Row 1 (Upcoming Events | Quick Actions), Row 2 (Recent Activity | Leaderboard). align-items: stretch makes each pair match height. */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
        {/* Row 1 Col 1 — Upcoming Events */}
        <PanelCard title="Upcoming Events" accentBorder accentColor="blue" accentSide="left" className="h-full">
          {upcomingEvents.length === 0 ? (
            <div className="flex items-center justify-between gap-3 py-2">
              <p className="text-sm text-[var(--gray-500)]">No upcoming events</p>
              <Link
                href="/events"
                className="text-xs font-medium text-[var(--deca-blue)] hover:underline shrink-0"
              >
                View events →
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-[var(--gray-200)]">
                {upcomingEvents.slice(0, 4).map((event) => {
                  const eventDate = parseEventDateTime(event.start_time, event.date);
                  const todayStart = startOfDay(now);
                  const eventDayStart = startOfDay(eventDate);
                  const daysUntil = differenceInDays(eventDayStart, todayStart);
                  const isToday = daysUntil === 0;
                  const countdown =
                    isToday ? "Today" : daysUntil === 1 ? "Tomorrow" : `in ${daysUntil} days`;
                  const typeLabel =
                    EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type ?? "Event";
                  return (
                    <li key={event.id}>
                      <EventRow
                        href={`/events/${event.id}`}
                        dateMonth={format(eventDate, "MMM")}
                        dateDay={format(eventDate, "d")}
                        typeTag={typeLabel}
                        locationTag={event.location ?? undefined}
                        relativeDay={countdown}
                        title={event.title}
                        time={format(eventDate, "h:mm a")}
                        isToday={isToday}
                      />
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/events"
                className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-[var(--deca-blue)] hover:underline"
              >
                View all events
                <ChevronRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </PanelCard>

        {/* Row 1 Col 2 — Quick Actions */}
        <PanelCard title="Quick Actions" accentBorder accentColor="blue" accentSide="right" className="flex h-full flex-col !p-4">
          <DashboardQuickActionsGrid />
        </PanelCard>

        {/* Row 2 Col 1 — Recent Activity */}
        <PanelCard title="Recent Activity" accentBorder accentColor="blue" accentSide="left" className="h-full">
          <RecentActivityFeed items={recentActivity} />
        </PanelCard>

        {/* Row 2 Col 2 — Leaderboard */}
        <PanelCard title="Leaderboard" href="/leaderboard" accentBorder accentColor="blue" accentSide="right" className="h-full">
          {topLeaderboard.length === 0 ? (
            <p className="text-sm text-[var(--gray-500)] py-2">No members yet</p>
          ) : (
            <>
              <ul className="space-y-2">
                {topLeaderboard.map((entry) => {
                  const t = getTier(entry.score);
                  const tierTextColor =
                    ["silver", "gold", "platinum", "bronze"].includes(t.name)
                      ? "#1a1a1a"
                      : "#fff";
                  return (
                    <li key={entry.id}>
                      <LeaderboardRow
                        rank={entry.rank}
                        name={entry.full_name}
                        avatarUrl={entry.avatar_url}
                        isYou={entry.isCurrentUser}
                        points={entry.score}
                        tier={formatTierForDisplay(t.name)}
                        tierColor={t.color}
                        tierTextColor={tierTextColor}
                      />
                    </li>
                  );
                })}
              </ul>
              <span className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-[var(--deca-blue)]">
                View full leaderboard
                <ChevronRight className="h-4 w-4" />
              </span>
            </>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

function RecentActivityFeed({ items }: { items: MemberActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <p className="text-sm text-[var(--gray-500)]">
          No activity yet — attend an event to get started!
        </p>
        <Link
          href="/events"
          className="text-xs font-medium text-[var(--deca-blue)] hover:underline shrink-0"
        >
          View Events
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-0">
      {items.slice(0, 5).map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 py-3 border-b border-[var(--gray-200)] last:border-0 last:pb-0 first:pt-0"
        >
          {item.type === "attendance" ? (
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--success)]" />
          ) : (
            <Pencil className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--deca-blue)]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[var(--gray-700)]">
              {item.type === "attendance" ? (
                <>
                  Attended &quot;{item.eventTitle}&quot;
                  {item.points > 0 && (
                    <span className="ml-1 inline-flex rounded-md bg-[var(--success-light)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--success)]">
                      +{item.points} pts
                    </span>
                  )}
                </>
              ) : (
                <>
                  Completed {item.eventCode} practice
                  {item.score > 0 && (
                    <span className="text-[var(--gray-600)]">
                      {" "}({(item.score / 10).toFixed(1)}/10)
                    </span>
                  )}
                  {item.points > 0 && (
                    <span className="ml-1 inline-flex rounded-md bg-[var(--success-light)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--success)]">
                      +{item.points} pts
                    </span>
                  )}
                </>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--gray-400)]">
              {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
