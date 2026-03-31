"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "deca_engage_ontario_disclaimer_dismissed";

export function DisclaimerBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      className="relative flex min-h-[2.5rem] shrink-0 items-center justify-center border-b border-amber-200/90 bg-amber-50 px-10 py-2 pr-12 text-center text-[0.75rem] leading-snug text-gray-800 sm:text-[0.8125rem]"
    >
      <p className="max-w-4xl">
        This platform is not affiliated with or endorsed by Ontario DECA. It was created as part of a
        Provincial Officer application.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-1/2 flex h-8 w-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-amber-100/80 hover:text-gray-900"
        aria-label="Dismiss disclaimer"
      >
        <span className="text-lg leading-none" aria-hidden>
          ✕
        </span>
      </button>
    </div>
  );
}
