export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <div className="h-8 w-64 rounded bg-gray-200" />
            <div className="mt-2 h-6 w-24 rounded bg-gray-200" />
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-10 w-32 rounded-lg bg-gray-200" />
              <div className="h-10 w-32 rounded-lg bg-gray-200" />
              <div className="h-10 w-24 rounded-lg bg-gray-200" />
            </div>
            <div className="h-96 rounded-xl border border-gray-200 bg-gray-50" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
            <div className="mt-2 h-5 w-20 rounded bg-gray-200" />
            <div className="mt-4 h-2 w-full rounded bg-gray-200" />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-36 rounded bg-gray-200" />
            <div className="mt-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 w-full rounded bg-gray-200" />
                  <div className="mt-1 h-3 w-3/4 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="mt-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 w-full rounded bg-gray-200" />
                  <div className="mt-1 h-3 w-2/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="h-8 w-12 rounded bg-gray-200" />
                <div className="mt-1 h-3 w-20 rounded bg-gray-100" />
              </div>
              <div>
                <div className="h-8 w-12 rounded bg-gray-200" />
                <div className="mt-1 h-3 w-16 rounded bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
