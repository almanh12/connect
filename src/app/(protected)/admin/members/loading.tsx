import { SkeletonTable } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-5 w-96 animate-pulse rounded bg-gray-100" />
      </div>
      <SkeletonTable rows={10} />
    </div>
  );
}
