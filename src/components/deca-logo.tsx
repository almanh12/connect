"use client";

import Image from "next/image";
import Link from "next/link";

type DecaLogoVariant = "white" | "blue";

interface DecaLogoProps {
  /** "white" for dark/blue backgrounds (uses filter), "blue" for light backgrounds */
  variant?: DecaLogoVariant;
  /** Width in pixels */
  width?: number;
  /** Height in pixels (default: width * 1.005 for aspect ratio) */
  height?: number;
  /** Show "Engage" text below/beside */
  showText?: boolean;
  /** Compact: diamond + "Engage" on same line (sidebar style) */
  compact?: boolean;
  /** Link href - omit to render without link */
  href?: string;
  className?: string;
}

const WHITE_FILTER = "brightness(0) invert(1)";

export function DecaLogo({
  variant = "blue",
  width = 80,
  height,
  showText = false,
  compact = false,
  href,
  className = "",
}: DecaLogoProps) {
  const h = height ?? Math.round(width * 1.005);
  const isWhite = variant === "white";

  const img = (
    <Image
      src="/deca-logo.png"
      alt="DECA"
      width={width}
      height={h}
      className={`shrink-0 object-contain ${className}`}
      style={isWhite ? { filter: WHITE_FILTER } : undefined}
      sizes={`${width}px`}
    />
  );

  const content = (
    <div
      className={`flex items-center ${compact ? "gap-1.5" : "flex-col gap-1"}`}
    >
      {img}
      {showText && (
        <span
          className={`font-gotham font-bold tracking-tight shrink-0 ${
            compact ? "text-sm sm:text-base" : "text-lg"
          } ${isWhite ? "text-white" : "text-[#1A1A2E]"}`}
        >
          Engage
        </span>
      )}
    </div>
  );

  const wrapperClass = `inline-flex transition-opacity hover:opacity-90 ${className}`;

  if (href) {
    return (
      <Link href={href} className={wrapperClass} title="DECA Engage">
        {content}
      </Link>
    );
  }
  return <div className={wrapperClass}>{content}</div>;
}
