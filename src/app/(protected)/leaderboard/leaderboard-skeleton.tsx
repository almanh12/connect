import { Skeleton } from "@/components/ui/skeleton";

/** Layout-matched leaderboard loading (header, podium, table). */
export function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-80 rounded-[var(--chip-radius)]" />
      <Skeleton className="h-[280px] w-full rounded-[var(--panel-radius)]" />
      <div className="overflow-hidden rounded-[var(--panel-radius)] border border-border bg-card">
        <div className="border-b border-border bg-muted px-5 py-3.5">
          <div className="flex gap-8">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <div className="divide-y divide-border p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-16 rounded-[var(--chip-radius)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
