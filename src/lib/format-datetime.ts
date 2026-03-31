import { format } from "date-fns";
import { enUS } from "date-fns/locale";

/** date-fns locale frozen to en-US — avoids Node vs browser ICU differences (hydration mismatches). */
const en = enUS;

/**
 * Practice hub list: "Mar 23, 2026 at 12:50 PM" (literal "at", not locale-dependent punctuation).
 */
export function formatSessionDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "MMM d, yyyy 'at' h:mm a", { locale: en });
}

/**
 * Session detail header: "March 23, 2026 at 12:50 PM"
 */
export function formatSessionDateTimeDetail(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return format(d, "MMMM d, yyyy 'at' h:mm a", { locale: en });
}

function timeKey(d: Date): string {
  return format(d, "h:mm a", { locale: en });
}

/**
 * Recharts x-axis: same day → time; else short dates — all via date-fns (no toLocale* hydration drift).
 */
export function formatPracticeChartXLabel(createdAt: Date, allDates: Date[]): string {
  if (allDates.length === 0) return format(createdAt, "MMM d", { locale: en });
  const times = allDates.map((d) => d.getTime());
  const minDate = new Date(Math.min(...times));
  const maxDate = new Date(Math.max(...times));
  const sameDay = minDate.toDateString() === maxDate.toDateString();
  const sameYear = minDate.getFullYear() === maxDate.getFullYear();
  const sameMonth = sameYear && minDate.getMonth() === maxDate.getMonth();

  if (sameDay) {
    const timeStr = timeKey(createdAt);
    const sameTimeDates = allDates
      .filter((d) => timeKey(d) === timeStr)
      .sort((a, b) => a.getTime() - b.getTime());
    if (sameTimeDates.length > 1) {
      const idx = sameTimeDates.findIndex((d) => d.getTime() === createdAt.getTime());
      return idx === 0 ? timeStr : `${timeStr} (${idx + 1})`;
    }
    return timeStr;
  }
  if (sameMonth) {
    return format(createdAt, "MMM d", { locale: en });
  }
  return format(createdAt, "MMM d, yyyy", { locale: en });
}
