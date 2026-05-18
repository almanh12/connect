"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  /** Shows spinner overlay on the control (e.g. during period navigation). */
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Segmented control with clear selected state (filled background, higher contrast).
 * Keyboard navigable with focus ring.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel = "View mode",
  loading = false,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-busy={loading}
      className={cn(
        "relative inline-flex rounded-[var(--chip-radius)] border border-border bg-muted p-0.5",
        (disabled || loading) && "pointer-events-none opacity-80"
      )}
    >
      {loading && (
        <span className="absolute inset-0 z-10 flex items-center justify-center rounded-[var(--chip-radius)] bg-muted/60">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        </span>
      )}
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--chip-radius)] px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
