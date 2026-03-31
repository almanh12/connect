"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { StatCard } from "@/components/ui/stat-card";
import { PanelCard } from "@/components/ui/panel-card";
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

const STATUS_COLORS: Record<string, string> = {
  registered: "#6b7280",
  confirmed: "#059669",
  completed: "#2563eb",
  withdrawn: "#ef4444",
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
  const router = useRouter();
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
    if (pullY > 60) router.refresh();
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
      className="dashboard-page max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-[var(--gray-50)]"
      onTouchStart={onPullStart}
      onTouchMove={onPullMove}
      onTouchEnd={onPullEnd}
    >
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
            accentColor="#0077B6"
          />
          <StatCard
            metric={String(eventsAttendedThisMonth)}
            label="Events Attended This Month"
            icon={Calendar}
            accentColor="#10B981"
          />
        </div>
        {/* Right: Compact Announcements */}
        <div
          className="card rounded-[18px] bg-white border border-[var(--gray-200)] p-4"
          style={{ borderTop: "4px solid #ef4444" }}
        >
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--gray-200)]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-500)]">
              Announcements
            </h2>
            {isOfficer && (
              <Link
                href="/admin/announcements"
                className="text-[11px] font-medium text-[var(--deca-blue)] hover:underline"
              >
                Post
              </Link>
            )}
          </div>
          <ErrorBoundary variant="section">
            {displayAnnouncements.length === 0 ? (
              <p className="text-sm text-[var(--gray-500)]">No announcements yet.</p>
            ) : (
              <ul className="space-y-2">
                {displayAnnouncements.map((ann) => (
                  <li key={ann.id}>
                    <Link
                      href="/announcements"
                      className="block py-0.5 -mx-1 px-1 rounded hover:bg-[var(--gray-100)]"
                    >
                      <p className="text-sm font-medium text-[var(--gray-900)] truncate">
                        {ann.title}
                      </p>
                      <p className="text-[11px] text-[var(--gray-500)]">
                        {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ErrorBoundary>
        </div>
      </div>

      {/* My Competition Events — shown when member has registrations */}
      {competitionRegistrations.length > 0 && (
        <div className="mb-4">
          <PanelCard
            title="My Competition Events"
            accentBorder
            accentColor="#7c3aed"
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
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${STATUS_COLORS[reg.status?.toLowerCase() ?? "registered"]}20`,
                          color: STATUS_COLORS[reg.status?.toLowerCase() ?? "registered"] ?? "#6b7280",
                        }}
                      >
                        {reg.status}
                      </span>
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
        <PanelCard title="Upcoming Events" accentBorder accentColor="#03396B" accentSide="left" className="h-full">
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
        <PanelCard title="Quick Actions" accentBorder accentColor="#03396B" accentSide="right" className="flex h-full flex-col !p-4">
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[1fr_1fr] gap-2">
            <Link
              href="/events"
              className="flex h-full min-h-0 flex-col cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] px-2 py-3 transition-all duration-200 hover:scale-[1.02] hover:border-[#bfdbfe] hover:bg-[#dbeafe] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-[#1e3a5f] dark:bg-[#1e293b] dark:hover:bg-[#1e3a5f]"
            >
              <Calendar className="h-8 w-8 shrink-0 text-[#2563eb]" />
              <span className="text-[11px] font-medium text-[#2563eb]">Join Event</span>
            </Link>
            <Link
              href="/practice"
              className="flex h-full min-h-0 flex-col cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#fde68a] bg-[#fefce8] px-2 py-3 transition-all duration-200 hover:scale-[1.02] hover:border-[#fde68a] hover:bg-[#fef9c3] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-[#4a4514] dark:bg-[#2d2a0f] dark:hover:bg-[#4a4514]"
            >
              <Pencil className="h-8 w-8 shrink-0 text-[#ca8a04]" />
              <span className="text-[11px] font-medium text-[#ca8a04]">Practice</span>
            </Link>
            <Link
              href="/ai-chat"
              className="flex h-full min-h-0 flex-col cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-3 transition-all duration-200 hover:scale-[1.02] hover:border-[#a7f3d0] hover:bg-[#d1fae5] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-[#1a3d2e] dark:bg-[#1a2e25] dark:hover:bg-[#1a3d2e]"
            >
              <MessageSquare className="h-8 w-8 shrink-0 text-[#059669]" />
              <span className="text-[11px] font-medium text-[#059669]">AI Chat</span>
            </Link>
            <Link
              href="/settings/profile"
              className="flex h-full min-h-0 flex-col cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#fed7aa] bg-[#fff7ed] px-2 py-3 transition-all duration-200 hover:scale-[1.02] hover:border-[#fed7aa] hover:bg-[#ffedd5] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-[#4a2d14] dark:bg-[#2d1f0f] dark:hover:bg-[#4a2d14]"
            >
              <User className="h-8 w-8 shrink-0 text-[#ea580c]" />
              <span className="text-[11px] font-medium text-[#ea580c]">View Profile</span>
            </Link>
          </div>
        </PanelCard>

        {/* Row 2 Col 1 — Recent Activity */}
        <PanelCard title="Recent Activity" accentBorder accentColor="#03396B" accentSide="left" className="h-full">
          <RecentActivityFeed items={recentActivity} />
        </PanelCard>

        {/* Row 2 Col 2 — Leaderboard */}
        <PanelCard title="Leaderboard" href="/leaderboard" accentBorder accentColor="#03396B" accentSide="right" className="h-full">
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
