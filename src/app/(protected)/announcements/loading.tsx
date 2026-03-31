import { SkeletonList } from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-5 w-96 animate-pulse rounded bg-gray-100" />
      </div>
      <SkeletonList count={5} />
    </div>
  );
}
