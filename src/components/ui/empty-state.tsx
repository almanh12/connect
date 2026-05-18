import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description?: string;
  primaryCta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty state: icon in small rounded square, optional title/description, primary CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryCta,
  action,
  className,
}: EmptyStateProps) {
  const cta = primaryCta ?? action;
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-4 px-4 py-8 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--deca-blue-light)] text-[var(--deca-blue)]">
        <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </div>
      {title && (
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      )}
      {description && (
        <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
