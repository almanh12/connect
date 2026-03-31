"use client";

import Link from "next/link";

interface PanelCardProps {
  title: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  accentBorder?: boolean;
  accentColor?: string;
  accentSide?: "left" | "right";
  className?: string;
}

/**
 * Panel card: white bg, subtle shadow, bold uppercase header,
 * optional right action (e.g. Post button), optional accent border.
 */
export function PanelCard({
  title,
  rightAction,
  children,
  href,
  accentBorder,
  accentColor,
  accentSide = "left",
  className = "",
}: PanelCardProps) {
  const accentStyle = accentBorder
    ? accentSide === "right"
      ? { borderRight: `4px solid ${accentColor ?? "#0077B6"}` }
      : { borderLeft: `4px solid ${accentColor ?? "#0077B6"}` }
    : undefined;
  const content = (
    <div
      className={`panel-card rounded-[18px] bg-white border border-[#E8ECF0] p-6 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
        href ? "cursor-pointer" : ""
      } ${className}`}
      style={accentStyle}
    >
      <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-[#F1F5F9]">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
          {title}
        </h2>
        {rightAction}
      </div>
      {children}
    </div>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
