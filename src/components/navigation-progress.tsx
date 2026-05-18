"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { navigationProgress } from "@/lib/navigation-progress";

function isInternalNavigation(href: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    const current = window.location.pathname + window.location.search;
    const target = url.pathname + url.search;
    return target !== current;
  } catch {
    return false;
  }
}

/**
 * Top-of-viewport progress bar for App Router navigations and router.refresh().
 * Uses click interception + pathname/searchParams settle (no fixed timer).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = navigationProgress.subscribe((next) => {
      setActive(next);
      if (!next) {
        setProgress(100);
        if (completeTimerRef.current != null) {
          window.clearTimeout(completeTimerRef.current);
        }
        completeTimerRef.current = window.setTimeout(() => {
          setProgress(0);
          completeTimerRef.current = null;
        }, 200);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || !isInternalNavigation(href)) return;

      navigationProgress.start();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    navigationProgress.complete();
  }, [pathname, searchParams]);

  useEffect(() => {
    activeRef.current = active;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!active) return;

    const tick = () => {
      if (!activeRef.current) return;
      setProgress((p) => {
        if (p >= 90) return p;
        const delta = (90 - p) * 0.08;
        return Math.min(Math.max(p, 12) + Math.max(delta, 0.4), 90);
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  useEffect(() => {
    return () => {
      if (completeTimerRef.current != null) {
        window.clearTimeout(completeTimerRef.current);
      }
    };
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 h-0.5 bg-[var(--deca-blue)]/20"
      style={{
        top: "var(--disclaimer-banner-height, 0px)",
        zIndex: "var(--z-nav-progress)",
      }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
      aria-busy={active}
    >
      <div
        className="h-full bg-[var(--deca-blue)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
