import { Skeleton } from "@/components/ui/skeleton";

/** Layout-matched dashboard loading state (hero → stats row → 2×2 panels). */
export function DashboardSkeleton() {
  return (
    <div className="dashboard-page max-w-[1200px] mx-auto animate-pulse space-y-4 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero banner */}
      <Skeleton className="h-[200px] w-full rounded-[var(--panel-radius)]" />

      {/* Stats + announcements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[120px] rounded-[var(--panel-radius)]" />
          <Skeleton className="h-[120px] rounded-[var(--panel-radius)]" />
        </div>
        <Skeleton className="h-[120px] rounded-[var(--panel-radius)]" />
      </div>

      {/* 2×2 panel grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="min-h-[280px] rounded-[var(--panel-radius)]" />
        <Skeleton className="min-h-[280px] rounded-[var(--panel-radius)]" />
        <Skeleton className="min-h-[240px] rounded-[var(--panel-radius)]" />
        <Skeleton className="min-h-[240px] rounded-[var(--panel-radius)]" />
      </div>
    </div>
  );
}
