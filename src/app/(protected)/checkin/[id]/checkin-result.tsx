"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const CONFETTI_COLORS = [
  "#FFD700", "#C0C0C0", "#CD7F32", "#0072CE", "#10B981",
  "#F59E0B", "#EF4444", "#8B5CF6",
];

interface CheckInResultProps {
  success: boolean;
  alreadyCheckedIn: boolean;
  error: string | null;
  points: number;
  eventTitle: string | null;
}

export function CheckInResult({
  success,
  alreadyCheckedIn,
  error,
  points,
  eventTitle,
}: CheckInResultProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (success && !alreadyCheckedIn) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(t);
    }
  }, [success, alreadyCheckedIn]);

  const confettiPieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: 10 + (i * 4) % 80,
    delay: (i * 0.04) % 0.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  if (error && !alreadyCheckedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl text-red-600">!</span>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Check-in Failed</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <Link
            href="/dashboard"
            className="mt-8 inline-block rounded-lg bg-[#0072CE] px-6 py-2.5 font-semibold text-white hover:bg-[#004B87]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center px-4">
      {/* Confetti */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        {alreadyCheckedIn ? (
          <>
            <div className="animate-checkmark mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">Already Checked In</h1>
            <p className="mt-2 text-gray-600">You&apos;ve already checked in to this event.</p>
          </>
        ) : (
          <>
            <div className="animate-checkmark mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">You&apos;re checked in!</h1>
            <p className="mt-2 text-lg font-semibold text-[#0072CE]">+{points} points</p>
            {eventTitle && <p className="mt-1 text-gray-600">{eventTitle}</p>}
          </>
        )}

        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-lg bg-[#0072CE] px-6 py-2.5 font-semibold text-white hover:bg-[#004B87]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
