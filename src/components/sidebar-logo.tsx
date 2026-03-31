"use client";

import Link from "next/link";

interface SidebarLogoProps {
  collapsed?: boolean;
}

/** DECA Engage logo image — white via filter, centered */
export function SidebarLogo({ collapsed = false }: SidebarLogoProps) {
  const width = collapsed ? 36 : 160;

  return (
    <Link
      href="/dashboard"
      className="flex items-center justify-center min-h-[64px] transition-opacity hover:opacity-90"
      title="DECA Engage"
    >
      <img
        src="/deca-engage-logo.png"
        alt="DECA Engage"
        width={width}
        className="object-contain"
        style={{ filter: "brightness(0) invert(1)", width: width, height: "auto" }}
      />
    </Link>
  );
}
