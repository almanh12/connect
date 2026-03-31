"use client";

import { useEffect, useRef, useState } from "react";

interface LazyChartProps {
  children: React.ReactNode;
  /** Min height to reserve before load (avoids layout shift) */
  minHeight?: number;
  fallback?: React.ReactNode;
}

export function LazyChart({
  children,
  minHeight = 256,
  fallback,
}: LazyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "100px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ minHeight }}
      className="relative w-full"
    >
      {visible ? (
        children
      ) : (
        fallback ?? (
          <div
            className="animate-pulse rounded-xl bg-gray-100"
            style={{ height: minHeight }}
          />
        )
      )}
    </div>
  );
}
