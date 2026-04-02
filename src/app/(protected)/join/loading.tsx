export default function JoinLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#0072CE]" />
      </div>
      <p className="mt-4 text-sm text-gray-500">Loading join…</p>
    </div>
  );
}
