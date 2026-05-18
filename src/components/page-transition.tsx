"use client";

import { usePathname } from "next/navigation";

/** Routes that use their own enter animation — skip shell page-enter. */
const SKIP_PAGE_ENTER = ["/dashboard", "/leaderboard"];

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skipEnter = SKIP_PAGE_ENTER.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (skipEnter) {
    return <>{children}</>;
  }

  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}
