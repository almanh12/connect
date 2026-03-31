import type { LucideIcon } from "lucide-react";

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
 * Matches dashboard screenshot styling.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryCta,
  action,
  className = "",
}: EmptyStateProps) {
  const cta = primaryCta ?? action;
  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center gap-4 py-8 px-4 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--deca-blue-light)] text-[var(--deca-blue)]">
        <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </div>
      {title && (
        <p className="text-sm font-medium text-[#475569]">{title}</p>
      )}
      {description && (
        <p className="max-w-[260px] text-xs text-[#64748B] leading-relaxed">
          {description}
        </p>
      )}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
