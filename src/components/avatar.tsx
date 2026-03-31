"use client";

import Image from "next/image";
import { useState } from "react";

function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return "bg-[var(--deca-blue)]";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [
    "bg-[var(--deca-blue)]",
    "bg-[#004B87]",      // Dark blue
    "bg-[#C8A415]",      // Gold
    "bg-[#10B981]",      // Emerald
    "bg-[#8B5CF6]",      // Violet
    "bg-[#F59E0B]",      // Amber
  ];
  return hues[Math.abs(hash) % hues.length];
}

export interface AvatarProps {
  /** Avatar image URL (e.g. from Google, Supabase). Falls back to initials if missing or fails. */
  src: string | null | undefined;
  /** Display name for initials fallback */
  name: string | null | undefined;
  /** Size preset or pixel value */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
  /** Additional class names for the container */
  className?: string;
  /** Optional ring/tier color class (e.g. ring-2 ring-amber-400) */
  ringClassName?: string;
  /** Override background for initials fallback (e.g. bg-[var(--deca-blue)]) */
  fallbackBg?: string;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  "2xl": 112,
} as const;

export function Avatar({
  src,
  name,
  size = "md",
  className = "",
  ringClassName = "",
  fallbackBg,
}: AvatarProps) {
  const [error, setError] = useState(false);
  const showImage = src && !error;
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size];
  const initials = getInitials(name);
  const bgColor = fallbackBg ?? getAvatarColor(name);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${ringClassName} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {showImage ? (
        <Image
          src={src}
          alt=""
          width={pixelSize}
          height={pixelSize}
          className="h-full w-full object-cover"
          sizes={`${pixelSize}px`}
          onError={() => setError(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center text-white font-bold ${bgColor}`}
          style={{
            fontSize: pixelSize <= 24 ? "0.65rem" : pixelSize <= 40 ? "0.875rem" : pixelSize <= 56 ? "1.25rem" : pixelSize <= 80 ? "1.5rem" : "1.75rem",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
