"use client";

import { useLayoutEffect, useRef, useState } from "react";

function setBannerHeightPx(px: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--disclaimer-banner-height",
    px > 0 ? `${px}px` : "0px"
  );
}

export function DisclaimerBanner() {
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible) {
      setBannerHeightPx(0);
      return;
    }

    const el = rootRef.current;
    if (!el) return;

    const sync = () => {
      setBannerHeightPx(el.offsetHeight);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      setBannerHeightPx(0);
    };
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    setBannerHeightPx(0);
  };

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      className="flex w-full shrink-0 items-center gap-3 border-b border-amber-200/90 bg-amber-50 px-4 py-2 text-[0.75rem] leading-snug text-gray-800 sm:px-6 sm:text-[0.8125rem]"
    >
      <div className="min-w-0 flex-1 text-center">
        <p className="mx-auto max-w-4xl">
          This platform is not affiliated with or endorsed by Ontario DECA. It was created as part of a
          Provincial Officer application.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-amber-100/80 hover:text-gray-900"
        aria-label="Dismiss disclaimer"
      >
        <span className="text-lg leading-none" aria-hidden>
          ✕
        </span>
      </button>
    </div>
  );
}
