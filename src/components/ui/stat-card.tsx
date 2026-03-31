"use client";

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  metric: string;
  label: string;
  icon: LucideIcon;
  accentColor: string;
  iconTint?: string;
}

/**
 * Stat card: white bg, subtle shadow, 16–20px radius, circular icon badge,
 * thin colored accent line on top, large bold metric, small uppercase label.
 */
export function StatCard({
  metric,
  label,
  icon: Icon,
  accentColor,
  iconTint,
}: StatCardProps) {
  const bg = iconTint ?? (accentColor === "#0077B6" ? "#B8D9ED" : accentColor === "#10B981" ? "#A7F3D0" : accentColor === "#F59E0B" ? "#FDE68A" : "#E5E5E5");
  return (
    <div
      className="stat-card rounded-[18px] bg-white border border-[#E8ECF0] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      style={{ borderTop: `4px solid ${accentColor}` } as React.CSSProperties}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full mb-3"
        style={{ backgroundColor: bg }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: accentColor }} />
      </div>
      <p className="text-[28px] font-bold leading-none text-[#1a1a1a]">
        {metric}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B] mt-1.5">
        {label}
      </p>
    </div>
  );
}
