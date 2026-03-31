"use client";

import { cn } from "@/lib/utils";

interface ContentGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 12-column CSS grid for page content. Use with col-span-* for layout.
 * gap: 24px. Use on pages that need asymmetric multi-column layouts.
 */
export function ContentGrid({ children, className = "" }: ContentGridProps) {
  return (
    <div
      className={cn("grid grid-cols-12 gap-6", className)}
    >
      {children}
    </div>
  );
}
