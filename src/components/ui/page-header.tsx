import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
  /** When true, reduces internal spacing (divider mt) for compact layouts */
  compact?: boolean;
}

/**
 * Page header pattern: back (if subpage) above, then title + action on same line.
 * Title left-aligned, action right-aligned. 1px divider below, 24px gap to content.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  backHref,
  action,
  className = "",
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      {(breadcrumbs?.length || backHref) && (
        <div className="mb-4 flex h-8 items-center gap-2">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] p-1.5 text-[var(--gray-500)] transition hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)]"
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} />
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--gray-500)] max-w-[80ch]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 sm:mt-0">{action}</div>}
      </div>
      <div className={cn("h-px bg-[var(--gray-200)]", compact ? "mt-6" : "mt-8")} />
    </header>
  );
}
