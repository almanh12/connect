import { Skeleton } from "@/components/ui/skeleton";

/** Practice hub: search, chips, event card grid. */
export function PracticeHubSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-[var(--radius-md)]" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-[var(--chip-radius)]" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[168px] rounded-[var(--panel-radius)]" />
        ))}
      </div>
    </div>
  );
}

/** Practice session detail: header + content blocks. */
export function PracticeSessionDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-8 px-4 py-8">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-[var(--panel-radius)]" />
      <Skeleton className="h-[120px] w-full rounded-[var(--panel-radius)]" />
      <Skeleton className="h-[280px] w-full rounded-[var(--panel-radius)]" />
    </div>
  );
}
