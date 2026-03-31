"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Crown, Search, TrendingUp, TrendingDown, Minus, Users, Trophy, Target, Award } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { getTier, formatTierForDisplay } from "@/lib/points";

/** Tier badge derived from engagement_score. Uses getTier() for correct tier/color. */
function TierBadge({ score }: { score: number }) {
  const tierInfo = getTier(score);
  const letter = tierInfo.name === "platinum" ? "P" : tierInfo.name.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: `${tierInfo.color}20`,
        color: tierInfo.color,
        border: `1px solid ${tierInfo.color}40`,
      }}
    >
      {letter}
    </span>
  );
}

/** Full tier name badge for table — pill with tier color bg and white text. */
function TierBadgeFull({ score }: { score: number }) {
  const tierInfo = getTier(score);
  const useLightText = ["silver", "gold", "platinum", "bronze"].includes(tierInfo.name);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: tierInfo.color,
        color: useLightText ? "#1a1a1a" : "#fff",
        border: `1px solid ${tierInfo.color}`,
      }}
    >
      {formatTierForDisplay(tierInfo.name)}
    </span>
  );
}

/** Trend: up/down arrow + value when data exists; otherwise "No trend data" empty state. */
function TrendIndicator({ rankChange }: { rankChange?: number }) {
  if (rankChange == null || rankChange === 0) {
    return (
      <span
        className="text-[var(--gray-400)]"
        title="No trend data"
        aria-label="No trend data"
      >
        —
      </span>
    );
  }
  const isUp = rankChange > 0;
  const label = isUp ? `Up ${rankChange} ranks` : `Down ${Math.abs(rankChange)} ranks`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${isUp ? "text-[var(--success)]" : "text-[var(--error)]"}`}
      role="img"
      aria-label={label}
    >
      {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      {isUp ? `+${rankChange}` : `−${Math.abs(rankChange)}`}
    </span>
  );
}

interface LeaderboardClientProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  grades: number[];
  currentUserRank: number;
  currentUserScore: number;
  currentUserTier: string;
  tierProgress: { currentTier: string; nextTier: string | null; pointsNeeded: number; progressPercent: number };
  monthlyBreakdown: Record<string, number>;
}

const PERIODS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
] as const;

/** 25 confetti pieces with varied position, duration, delay, color, and shape. */
const CONFETTI_PIECES = [
  { left: 5, duration: 4.2, delay: 0, color: "#f59e0b", diamond: false },
  { left: 12, duration: 5.1, delay: 1.2, color: "#eab308", diamond: true },
  { left: 18, duration: 3.8, delay: 2.5, color: "#fbbf24", diamond: false },
  { left: 25, duration: 6.2, delay: 0.8, color: "#d97706", diamond: true },
  { left: 32, duration: 4.5, delay: 3.1, color: "#fcd34d", diamond: false },
  { left: 40, duration: 5.8, delay: 0.3, color: "#f59e0b", diamond: true },
  { left: 48, duration: 3.2, delay: 4.2, color: "#eab308", diamond: false },
  { left: 55, duration: 6.5, delay: 1.5, color: "#fbbf24", diamond: true },
  { left: 62, duration: 4.0, delay: 2.8, color: "#d97706", diamond: false },
  { left: 70, duration: 5.3, delay: 0.1, color: "#fcd34d", diamond: true },
  { left: 78, duration: 3.6, delay: 3.7, color: "#f59e0b", diamond: false },
  { left: 85, duration: 6.0, delay: 1.0, color: "#eab308", diamond: true },
  { left: 92, duration: 4.8, delay: 4.5, color: "#fbbf24", diamond: false },
  { left: 8, duration: 5.5, delay: 2.2, color: "#d97706", diamond: true },
  { left: 22, duration: 3.4, delay: 0.6, color: "#fcd34d", diamond: false },
  { left: 38, duration: 6.3, delay: 3.3, color: "#f59e0b", diamond: true },
  { left: 52, duration: 4.1, delay: 1.8, color: "#eab308", diamond: false },
  { left: 68, duration: 5.7, delay: 4.0, color: "#fbbf24", diamond: true },
  { left: 82, duration: 3.9, delay: 0.5, color: "#d97706", diamond: false },
  { left: 95, duration: 6.1, delay: 2.9, color: "#fcd34d", diamond: true },
  { left: 15, duration: 4.6, delay: 3.5, color: "#f59e0b", diamond: false },
  { left: 30, duration: 5.2, delay: 1.2, color: "#eab308", diamond: true },
  { left: 45, duration: 3.7, delay: 4.8, color: "#fbbf24", diamond: false },
  { left: 60, duration: 6.4, delay: 0.9, color: "#d97706", diamond: true },
  { left: 75, duration: 4.3, delay: 2.4, color: "#fcd34d", diamond: false },
];

function PodiumConfetti() {
  return (
    <div className="leaderboard-confetti-container" aria-hidden>
      {CONFETTI_PIECES.map((p, i) => (
        <div
          key={i}
          className={`leaderboard-confetti-piece ${p.diamond ? "leaderboard-confetti-piece--diamond" : "leaderboard-confetti-piece--rect"}`}
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function LeaderboardClient({
  entries = [],
  currentUserId,
  currentUserRank,
  currentUserScore,
  currentUserTier,
  tierProgress = { currentTier: "", nextTier: null, pointsNeeded: 0, progressPercent: 0 },
}: LeaderboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") ?? "all") as string;
  const [searchQuery, setSearchQuery] = useState("");

  const safeEntries = Array.isArray(entries) ? entries : [];

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return safeEntries;
    const q = searchQuery.toLowerCase().trim();
    return safeEntries.filter(
      (e) =>
        (e.full_name ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q)
    );
  }, [safeEntries, searchQuery]);

  const updatePeriod = (p: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("period", p);
    router.push(`/leaderboard?${next.toString()}`);
  };

  const top3 = safeEntries.slice(0, 3);
  const isSolo = safeEntries.length === 1;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Leaderboard"
        description="See how you rank against your chapter members."
        action={
          <SegmentedControl
            options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            value={period}
            onChange={updatePeriod}
            aria-label="Time range"
          />
        }
      />

      {/* Solo state - 1 member only */}
      {isSolo && (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-[var(--gray-200)] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--deca-gold-light)] mb-4">
            <Crown className="h-8 w-8 text-[var(--deca-gold)]" />
          </div>
          <p className="text-lg font-medium text-[var(--gray-900)]">
            You&apos;re the only member — you&apos;re #1 by default!
          </p>
          <p className="mt-1 text-sm text-[var(--gray-500)] max-w-[320px]">
            Invite members to get the competition going.
          </p>
          <Link
            href="/admin"
            className="mt-4 rounded-[var(--radius-sm)] bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--deca-blue-dark)]"
          >
            Invite Members
          </Link>
        </div>
      )}

      {/* Kahoot-style Podium */}
      {!isSolo && top3.length > 0 && (
        <div className="leaderboard-podium-stage">
          <PodiumConfetti />
          <div className="relative z-10 flex flex-col items-center gap-0 sm:flex-row sm:items-end sm:justify-center sm:gap-2">
            {/* #2 - left */}
            {top3.length >= 2 ? (
              <PodiumBlock
                entry={top3[1]}
                rank={2}
                isCurrentUser={top3[1].id === currentUserId}
              />
            ) : (
              <PodiumPlaceholder rank={2} />
            )}
            {/* #1 - center */}
            <PodiumBlock
              entry={top3[0]}
              rank={1}
              isCurrentUser={top3[0].id === currentUserId}
            />
            {/* #3 - right */}
            {top3.length >= 3 ? (
              <PodiumBlock
                entry={top3[2]}
                rank={3}
                isCurrentUser={top3[2].id === currentUserId}
              />
            ) : (
              <PodiumPlaceholder rank={3} />
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      {!isSolo && safeEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--gray-200)] bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md">
            <Users className="h-5 w-5 text-[var(--deca-blue)]" />
            <span className="text-sm font-medium text-[var(--gray-700)]">
              Total Members: <strong className="text-[var(--gray-900)]">{safeEntries.length}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--gray-200)] bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md">
            <Trophy className="h-5 w-5 text-[var(--deca-gold)]" />
            <span className="text-sm font-medium text-[var(--gray-700)]">
              Your Rank: <strong className="text-[var(--gray-900)]">#{currentUserRank}</strong> of {safeEntries.length}
            </span>
          </div>
          {tierProgress.nextTier && tierProgress.pointsNeeded > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--gray-200)] bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md">
              <Target className="h-5 w-5 text-[var(--success)]" />
              <span className="text-sm font-medium text-[var(--gray-700)]">
                Points to Next Tier: <strong className="text-[var(--gray-900)]">{tierProgress.pointsNeeded}</strong> pts
              </span>
            </div>
          )}
          {safeEntries.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--gray-200)] bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md">
              <Award className="h-5 w-5 text-[#f59e0b]" />
              <span className="text-sm font-medium text-[var(--gray-700)]">
                Top Performer: <strong className="text-[var(--gray-900)]">{safeEntries[0].full_name ?? "—"}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      {safeEntries.length > 1 && (
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members…"
            aria-label="Search members"
            className="w-full max-w-sm rounded-xl border border-[var(--gray-200)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--gray-700)] placeholder:text-[var(--gray-400)] shadow-sm transition focus:border-[var(--deca-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--deca-blue)] focus:ring-offset-0"
          />
        </div>
      )}

      {/* Rankings table */}
      <div className="overflow-hidden rounded-[18px] border border-[var(--gray-200)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
              <th className="w-14 px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-500)]">
                #
              </th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-500)]">
                Member
              </th>
              <th className="w-24 px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-500)]">
                Score
              </th>
              <th className="w-24 px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-500)]">
                Tier
              </th>
              <th className="w-20 px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gray-500)]">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => {
              const rank = safeEntries.findIndex((e) => e.id === entry.id) + 1;
              const isCurrentUser = entry.id === currentUserId;
              const score = entry.engagement_score ?? 0;
              const rowBg = index % 2 === 0 ? "bg-[#fafafa]" : "bg-white";

              return (
                <tr
                  key={entry.id}
                  className={`leaderboard-table-row border-b border-[var(--gray-100)] transition-colors duration-150 ${
                    isCurrentUser
                      ? "bg-[#eff6ff] border-l-4 border-l-[#03396B]"
                      : `${rowBg} hover:bg-[var(--deca-blue-light)]/40 hover:border-l-2 hover:border-l-[var(--deca-blue-muted)]`
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="w-14 px-5 py-4">
                    {rank <= 3 ? (
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                          rank === 1 ? "leaderboard-rank-badge-1" : rank === 2 ? "leaderboard-rank-badge-2" : "leaderboard-rank-badge-3"
                        }`}
                        style={{
                          backgroundColor:
                            rank === 1
                              ? "#f59e0b"
                              : rank === 2
                                ? "#9ca3af"
                                : "#b45309",
                        }}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--gray-600)]">#{rank}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={entry.avatar_url}
                        name={entry.full_name}
                        size={36}
                        fallbackBg="bg-[var(--deca-blue)]"
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium text-[var(--gray-900)]">
                          {entry.full_name ?? "Unknown"}
                          {isCurrentUser && (
                            <span className="inline-flex rounded-full bg-[var(--deca-blue)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                              You
                            </span>
                          )}
                        </p>
                        {entry.email && (
                          <p className="mt-0.5 truncate text-[12px] text-[var(--gray-500)] max-w-[220px]">
                            {entry.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="w-24 px-5 py-4 text-right text-sm font-bold tabular-nums text-[var(--deca-blue)]">
                    {entry.engagement_score} pts
                  </td>
                  <td className="w-24 px-5 py-4">
                    <TierBadgeFull score={score} />
                  </td>
                  <td className="w-20 px-5 py-4">
                    <TrendIndicator rankChange={entry.rankChange} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredEntries.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--gray-500)]">
            {searchQuery ? "No members match your search." : "No members to display. Invite members to your chapter."}
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumPlaceholder({ rank }: { rank: number }) {
  const barHeight = rank === 2 ? "170px" : "130px";
  const barClass = rank === 2 ? "leaderboard-podium-bar leaderboard-podium-bar-2" : "leaderboard-podium-bar leaderboard-podium-bar-3";
  return (
    <div
      className="flex w-[140px] min-w-[120px] flex-col items-center sm:w-[160px]"
      style={{ order: rank === 2 ? -1 : 1 }}
    >
      <div className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[var(--gray-300)] bg-[var(--gray-50)]/80 px-3 py-6 backdrop-blur-sm">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gray-200)] text-lg font-bold text-[var(--gray-400)]">
          ?
        </span>
        <p className="mt-2 text-center text-sm font-medium text-[var(--gray-400)]">—</p>
        <p className="mt-0.5 text-center text-xs text-[var(--gray-400)]">— pts</p>
      </div>
      <div
        className={`mt-2 w-full min-w-[100px] ${barClass}`}
        style={{ height: barHeight }}
      />
    </div>
  );
}

function PodiumBlock({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const score = entry.engagement_score ?? 0;
  const isFirst = rank === 1;
  const tierInfo = getTier(score);
  const barClass =
    rank === 1
      ? "leaderboard-podium-bar leaderboard-podium-bar-1"
      : rank === 2
        ? "leaderboard-podium-bar leaderboard-podium-bar-2"
        : "leaderboard-podium-bar leaderboard-podium-bar-3";
  const badgeClass =
    rank === 1 ? "leaderboard-rank-badge-1" : rank === 2 ? "leaderboard-rank-badge-2" : "leaderboard-rank-badge-3";
  const badgeBg = rank === 1 ? "#f59e0b" : rank === 2 ? "#9ca3af" : "#b45309";

  return (
    <div
      className="flex w-[140px] min-w-[120px] flex-col items-center sm:w-[160px]"
      style={{ order: rank === 2 ? -1 : rank === 3 ? 1 : 0 }}
    >
      {/* Member card on top of bar */}
      <div className="relative z-10 flex w-full flex-col items-center rounded-2xl border border-white/20 bg-white/95 px-3 py-4 shadow-lg backdrop-blur-sm">
        {isFirst && (
          <div
            className="absolute -top-5"
            style={{ animation: "leaderboard-crown-float 2s ease-in-out infinite" }}
            aria-hidden
          >
            <Crown className="h-8 w-8 text-[#f59e0b]" fill="#f59e0b" />
          </div>
        )}
        <span
          className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${badgeClass}`}
          style={{ backgroundColor: badgeBg }}
        >
          {rank}
        </span>
        <div
          className="relative flex rounded-full p-0.5"
          style={{ boxShadow: `0 0 0 3px ${tierInfo.color}` }}
        >
          <Avatar
            src={entry.avatar_url}
            name={entry.full_name}
            size={isFirst ? 72 : 64}
            fallbackBg="bg-[var(--deca-blue)]"
          />
        </div>
        <p className="mt-3 flex max-w-[130px] flex-col items-center gap-1 truncate text-center">
          <span className="text-sm font-bold text-[var(--gray-900)]">
            {entry.full_name ?? "Unknown"}
          </span>
          {isCurrentUser && (
            <span
              className="inline-flex rounded-full bg-[var(--deca-blue)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
              aria-label="You"
            >
              You
            </span>
          )}
        </p>
        <p className={`mt-1 font-bold text-[var(--deca-blue)] ${isFirst ? "text-base" : "text-sm"}`}>
          {score} pts
        </p>
        <div className="mt-2">
          <TierBadgeFull score={score} />
        </div>
      </div>
      {/* Podium bar */}
      <div className={`${barClass} mt-2 w-full min-w-[100px]`} />
    </div>
  );
}
