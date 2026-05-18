"use client";

import type { LucideIcon } from "lucide-react";

import {
  ACCENT_TONE_STYLES,
  type AccentTone,
} from "@/components/ui/accent-tone";
import { cn } from "@/lib/utils";

interface StatCardProps {
  metric: string;
  label: string;
  icon: LucideIcon;
  accentColor: AccentTone;
}

/**
 * Stat card: card bg, elevated shadow, panel radius, circular icon badge,
 * thin colored accent line on top, large bold metric, small uppercase label.
 */
export function StatCard({
  metric,
  label,
  icon: Icon,
  accentColor,
}: StatCardProps) {
  const { accent, tint } = ACCENT_TONE_STYLES[accentColor];

  return (
    <div
      className={cn(
        "stat-card rounded-[var(--panel-radius)] border border-[var(--border-subtle,var(--border))] bg-card p-5 shadow-[var(--shadow-elevated)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
      )}
      style={{ borderTop: `4px solid ${accent}` }}
    >
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: tint }}
      >
        <Icon
          className="h-5 w-5"
          strokeWidth={1.5}
          style={{ color: accent }}
        />
      </div>
      <p className="text-[28px] font-bold leading-none text-foreground">
        {metric}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export type { AccentTone };
