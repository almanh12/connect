"use client";

interface DiamondIconProps {
  className?: string;
  size?: number;
  /** Override fill color (default: currentColor) */
  fill?: string;
}

/** DECA diamond motif — solid rhombus shape */
export function DiamondIcon({
  className = "",
  size = 16,
  fill = "currentColor",
}: DiamondIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      className={className}
      aria-hidden
    >
      <path d="M12 2L22 12L12 22L2 12L12 2Z" />
    </svg>
  );
}
