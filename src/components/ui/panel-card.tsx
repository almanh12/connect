"use client";

import Link from "next/link";

import {
  ACCENT_TONE_STYLES,
  type AccentTone,
} from "@/components/ui/accent-tone";
import { cn } from "@/lib/utils";

interface PanelCardProps {
  title: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  accentBorder?: boolean;
  accentColor?: AccentTone;
  accentSide?: "left" | "right";
  className?: string;
}

/**
 * Panel card: card bg, subtle shadow, bold uppercase header,
 * optional right action (e.g. Post button), optional accent border.
 */
export function PanelCard({
  title,
  rightAction,
  children,
  href,
  accentBorder,
  accentColor = "blue",
  accentSide = "left",
  className,
}: PanelCardProps) {
  const accent = ACCENT_TONE_STYLES[accentColor].accent;
  const accentStyle = accentBorder
    ? accentSide === "right"
      ? { borderRight: `4px solid ${accent}` }
      : { borderLeft: `4px solid ${accent}` }
    : undefined;

  const content = (
    <div
      className={cn(
        "panel-card rounded-[var(--panel-radius)] border border-[var(--border-subtle,var(--border))] bg-card p-6 shadow-[var(--shadow-elevated)] transition-all duration-200 hover:shadow-[var(--shadow-elevated)]",
        href && "cursor-pointer",
        className
      )}
      style={accentStyle}
    >
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-[var(--border-subtle,var(--border))] pb-4">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </h2>
        {rightAction}
      </div>
      {children}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
