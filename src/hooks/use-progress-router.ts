"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { navigationProgress } from "@/lib/navigation-progress";

/**
 * Drop-in replacement for `useRouter` that starts the nav progress bar
 * on programmatic navigation and `refresh()`.
 */
export function useProgressRouter(): ReturnType<typeof useRouter> {
  const router = useRouter();

  return useMemo(
    () => ({
      ...router,
      push: (href, options) => {
        navigationProgress.start();
        return router.push(href, options);
      },
      replace: (href, options) => {
        navigationProgress.start();
        return router.replace(href, options);
      },
      refresh: () => {
        navigationProgress.start();
        return router.refresh();
      },
    }),
    [router]
  );
}
