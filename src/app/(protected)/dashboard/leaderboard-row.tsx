"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";

interface LeaderboardRowProps {
  rank: number;
  name: string;
  avatarUrl?: string | null;
  isYou: boolean;
  points: number;
  tier: string;
  tierColor: string;
  tierTextColor: string;
  href?: string;
}

/**
 * Leaderboard row: rank, avatar, name (you), points, tier pill.
 */
export function LeaderboardRow({
  rank,
  name,
  avatarUrl,
  isYou,
  points,
  tier,
  tierColor,
  tierTextColor,
  href,
}: LeaderboardRowProps) {
  const content = (
    <div
      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors duration-200 ${
        isYou
          ? "bg-[#EFF6FF] border border-[#BFDBFE]"
          : "hover:bg-[var(--deca-blue-light)]/40"
      } ${href ? "cursor-pointer" : ""}`}
    >
      <span className="text-lg font-bold text-[#94A3B8] w-6 shrink-0">
        #{rank}
      </span>
      <Avatar
        src={avatarUrl}
        name={name}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[#1e293b] truncate">
          {name}
          {isYou && (
            <span className="ml-1 text-[11px] text-[var(--deca-blue)] font-semibold">
              (you)
            </span>
          )}
        </p>
        <p className="text-xs text-[#64748B]">
          {points} pts
        </p>
      </div>
      <span
        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold shrink-0"
        style={{
          backgroundColor: tierColor,
          color: tierTextColor,
        }}
      >
        {tier}
      </span>
    </div>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
