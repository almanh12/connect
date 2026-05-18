import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  HandCoins,
  Handshake,
  Mic2,
  PartyPopper,
  Trophy,
  Wrench,
} from "lucide-react";

/** Lucide icons for DECA event types (replaces emoji map). */
export const EVENT_TYPE_LUCIDE: Record<string, LucideIcon> = {
  meeting: ClipboardList,
  mcq_practice: ClipboardList,
  roleplay_practice: Mic2,
  workshop: Wrench,
  social: PartyPopper,
  fundraiser: HandCoins,
  community_service: Handshake,
  competition: Trophy,
  optional: Calendar,
  other: Calendar,
};

export function getEventTypeIcon(eventType: string | null | undefined): LucideIcon {
  return EVENT_TYPE_LUCIDE[eventType ?? ""] ?? Calendar;
}
