import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse event start/end time into a valid Date object.
 * Handles both:
 * - Full ISO datetime (e.g., "2025-03-20T15:00:00.000Z")
 * - HH:MM or HH:MM:SS (e.g., "15:00") — requires eventDate to build a valid Date
 */
export function parseEventDateTime(
  timeStr: string,
  eventDate?: string | null
): Date {
  if (!timeStr) return new Date(NaN);
  // Full ISO datetime
  if (timeStr.includes("T") || timeStr.length > 12) {
    const d = new Date(timeStr);
    return d;
  }
  // HH:MM or HH:MM:SS — combine with date
  const date = eventDate ?? new Date().toISOString().slice(0, 10);
  const combined = `${date}T${timeStr.length === 5 ? timeStr + ":00" : timeStr}`;
  return new Date(combined);
}

/**
 * Format HH:MM string to "3:00 PM" for display when we only have the time.
 */
export function formatTimeHHMM(hhmm: string): string {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return hhmm;
  const parts = hhmm.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  const date = new Date(2000, 0, 1, h, m);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Get YYYY-MM-DD date key from an event for grouping/sorting.
 */
export function getEventDateKey(event: {
  date?: string | null;
  start_time: string;
}): string {
  if (event.date) return event.date.slice(0, 10);
  if (event.start_time.includes("T")) return event.start_time.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build full ISO start/end for FullCalendar from event with date + HH:MM.
 */
export function getEventStartEnd(event: {
  date?: string | null;
  start_time: string;
  end_time: string;
}): { start: string; end: string } {
  const date = event.date ?? (event.start_time.includes("T") ? event.start_time.slice(0, 10) : null);
  const pad = (t: string) => (t.length === 5 ? `${t}:00` : t);
  const start =
    date && !event.start_time.includes("T")
      ? `${date}T${pad(event.start_time)}`
      : event.start_time;
  const end =
    date && !event.end_time.includes("T")
      ? `${date}T${pad(event.end_time)}`
      : event.end_time;
  return { start, end };
}
