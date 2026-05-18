import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Calendar, MessageSquare, Pencil, User } from "lucide-react";

import { cn } from "@/lib/utils";

const ACTIONS: {
  href: string;
  label: string;
  icon: LucideIcon;
  surface: string;
  iconClass: string;
  labelClass: string;
}[] = [
  {
    href: "/events",
    label: "Join Event",
    icon: Calendar,
    surface:
      "border-[var(--deca-blue-light)] bg-[var(--deca-blue-light)] hover:bg-[var(--deca-blue-light)]/80",
    iconClass: "text-[var(--deca-blue)]",
    labelClass: "text-[var(--deca-blue-dark)]",
  },
  {
    href: "/practice",
    label: "Practice",
    icon: Pencil,
    surface:
      "border-[var(--warning-light)] bg-[var(--warning-light)] hover:bg-[var(--warning-light)]/80",
    iconClass: "text-warning",
    labelClass: "text-warning",
  },
  {
    href: "/ai-chat",
    label: "AI Chat",
    icon: MessageSquare,
    surface:
      "border-[var(--success-light)] bg-[var(--success-light)] hover:bg-[var(--success-light)]/80",
    iconClass: "text-success",
    labelClass: "text-success",
  },
  {
    href: "/settings/profile",
    label: "View Profile",
    icon: User,
    surface: "border-border bg-muted hover:bg-muted/80",
    iconClass: "text-muted-foreground",
    labelClass: "text-foreground",
  },
];

/** Tokenized 2×2 quick-action grid with 44px touch targets. */
export function DashboardQuickActionsGrid() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[1fr_1fr] gap-2">
      {ACTIONS.map(({ href, label, icon: Icon, surface, iconClass, labelClass }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex min-h-11 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border px-2 py-3 transition-all duration-200",
            "hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]",
            surface
          )}
        >
          <Icon className={cn("h-8 w-8 shrink-0", iconClass)} aria-hidden />
          <span className={cn("text-[11px] font-medium", labelClass)}>{label}</span>
        </Link>
      ))}
    </div>
  );
}
