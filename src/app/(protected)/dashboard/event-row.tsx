"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface EventRowProps {
  href: string;
  dateMonth: string;
  dateDay: string;
  typeTag: string;
  locationTag?: string;
  relativeDay: string;
  title: string;
  time: string;
  isToday?: boolean;
}

/**
 * Event row: date badge, type/location tags, title, time, chevron.
 * Hover/focus styling for clickability.
 */
export function EventRow({
  href,
  dateMonth,
  dateDay,
  typeTag,
  locationTag,
  relativeDay,
  title,
  time,
  isToday,
}: EventRowProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 py-4 -mx-6 px-6 rounded-xl transition-colors duration-200 hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-inset group border-l-4 ${
        isToday
          ? "border-l-[var(--deca-blue)] bg-[var(--deca-blue-light)]/30"
          : "border-l-transparent"
      }`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl transition-colors ${
          isToday
            ? "bg-[var(--deca-blue-light)] group-hover:bg-[var(--deca-blue)]/20"
            : "bg-[var(--deca-blue-light)]/60 group-hover:bg-[var(--deca-blue)]/20"
        }`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--deca-blue)]">
          {dateMonth}
        </span>
        <span className="text-xl font-bold text-[var(--deca-blue)]">
          {dateDay}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isToday && (
            <span className="rounded bg-[var(--deca-blue)] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
              Today
            </span>
          )}
          <span className="inline-flex rounded-lg bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
            {typeTag}
          </span>
          {locationTag && (
            <span className="text-[11px] text-[#64748B] truncate max-w-[100px]">
              {locationTag}
            </span>
          )}
          <span className="text-[11px] text-[#94A3B8]">
            {relativeDay}
          </span>
        </div>
        <p className="font-medium text-[#1e293b] truncate mt-0.5">
          {title}
        </p>
        <p className="text-xs text-[#64748B]">
          {time}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#CBD5E1] group-hover:text-[var(--deca-blue)] transition-colors" />
    </Link>
  );
}
