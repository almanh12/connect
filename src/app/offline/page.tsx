"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm max-w-md text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <WifiOff className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          You&apos;re offline
        </h1>
        <p className="mt-2 text-gray-600">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#0072CE] px-6 py-2.5 font-semibold text-white transition hover:bg-[#004B87] active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="mt-3 text-sm font-medium text-[#0072CE] hover:underline"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
}
