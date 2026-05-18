"use client";

import { useMemo, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { Event } from "@/lib/types";
import { parseEventDateTime, getEventDateKey } from "@/lib/utils";
import { EventModal } from "./event-modal";

function getEventColor(event: Event): string {
  const isMandatory = event.is_mandatory ?? false;
  if (isMandatory) return "var(--error)";
  return "var(--deca-blue)";
}

interface CalendarMonthProps {
  events: Event[];
  userId: string;
}

export function CalendarMonth({
  events,
  userId,
}: CalendarMonthProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const d = getEventDateKey(e);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return map;
  }, [events]);

  const { days, startPad, monthStart } = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const daysInMonth = eachDayOfInterval({ start, end });
    const pad = start.getDay();
    return {
      days: daysInMonth,
      startPad: pad,
      monthStart: start,
    };
  }, [viewDate]);

  const eventsOnSelectedDate = selectedDate
    ? eventsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  const goPrevMonth = useCallback(() => setViewDate((d) => subMonths(d, 1)), []);
  const goNextMonth = useCallback(() => setViewDate((d) => addMonths(d, 1)), []);

  const upcomingEventsList = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => parseEventDateTime(e.start_time, e.date) >= now)
      .sort(
        (a, b) =>
          parseEventDateTime(a.start_time, a.date).getTime() -
          parseEventDateTime(b.start_time, b.date).getTime()
      )
      .slice(0, 14);
  }, [events]);

  const upcomingByDate = useMemo(() => {
    const acc: Record<string, Event[]> = {};
    for (const e of upcomingEventsList) {
      const d = getEventDateKey(e);
      if (!acc[d]) acc[d] = [];
      acc[d].push(e);
    }
    return acc;
  }, [upcomingEventsList]);

  const todayEventIds = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return (eventsByDate.get(today) ?? []).map((e) => e.id);
  }, [eventsByDate]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (touchStart == null || touchEnd == null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goNextMonth();
    else if (distance < -minSwipeDistance) goPrevMonth();
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[140px] sm:min-w-[180px] text-center text-base font-semibold text-slate-900 font-gotham sm:text-lg">
            {format(viewDate, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            onClick={goNextMonth}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 shadow-card">
          <p className="text-center text-sm text-slate-500">No events yet</p>
        </div>
      ) : (
        <>
          {/* Calendar grid - hidden on mobile, show list view instead */}
          <div
            key={format(viewDate, "yyyy-MM")}
            className="hidden md:block overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card"
          >
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-medium uppercase tracking-wider text-slate-500"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: startPad }, (_, i) => (
                <div key={`pad-${i}`} className="min-h-[80px] border-b border-r border-slate-100 p-1" />
              ))}
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(key) ?? [];
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayCell = isToday(day);
                return (
                  <div
                    key={key}
                    className={`min-h-[80px] border-b border-r border-slate-100 p-1 ${
                      !isSameMonth(day, monthStart) ? "bg-slate-50" : ""
                    } ${isTodayCell ? "bg-[var(--deca-blue-light)]" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                        isSelected || isTodayCell
                          ? "bg-[var(--deca-blue)] text-white"
                          : "text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {format(day, "d")}
                    </button>
                    <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          role="button"
                          tabIndex={0}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedEvent(e);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              setSelectedEvent(e);
                            }
                          }}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getEventColor(e) }}
                          title={e.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] font-medium text-gray-500">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div
              className="hidden md:block rounded-xl border border-slate-200/80 bg-white p-4 shadow-card"
              role="dialog"
              aria-label="Events on selected date"
            >
              <h3 className="text-sm font-semibold text-gray-900">
                {format(selectedDate, "EEEE, MMMM d")}
              </h3>
              {eventsOnSelectedDate.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No events this day</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {eventsOnSelectedDate.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition hover:border-[var(--deca-blue-muted)]"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseEventDateTime(event.start_time, event.date), "h:mm a")} –{" "}
                          {format(parseEventDateTime(event.end_time, event.date), "h:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(event.is_mandatory ?? false) && (
                          <span className="rounded bg-[var(--deca-blue-light)] px-1.5 py-0.5 text-xs font-medium text-[var(--deca-blue)]">
                            Mandatory
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="rounded-[var(--radius-sm)] bg-[var(--deca-blue)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--deca-blue-dark)]"
                        >
                          View
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {selectedEvent && (
            <EventModal
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </>
      )}

      {/* Mobile list view - default on mobile when calendar grid hidden */}
      <div className="md:hidden">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Upcoming Events</h3>
        <div className="space-y-4">
          {Object.keys(upcomingByDate).length === 0 ? (
            <div className="rounded-xl border border-slate-200/80 bg-white p-8 shadow-card">
              <p className="text-center text-sm text-slate-500">No upcoming events</p>
            </div>
          ) : (
            Object.entries(upcomingByDate).map(([date, evts]) => (
              <div key={date}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {evts[0] ? format(parseEventDateTime(evts[0].start_time, evts[0].date), "EEEE, MMM d") : date}
                </h4>
                <ul className="space-y-2">
                  {evts.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-card"
                    >
                      <p className="font-medium text-gray-900">{e.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(parseEventDateTime(e.start_time, e.date), "h:mm a")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(e)}
                        className="mt-2 flex min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--deca-blue)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--deca-blue-dark)]"
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Desktop: upcoming list below calendar */}
      <div className="hidden md:block mt-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Upcoming</h3>
        <div className="space-y-4">
          {Object.entries(upcomingByDate).map(([date, evts]) => (
            <div key={date}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                {evts[0] ? format(parseEventDateTime(evts[0].start_time, evts[0].date), "EEEE, MMM d") : date}
              </h4>
              <ul className="space-y-2">
                {evts.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-card"
                  >
                    <p className="font-medium text-gray-900">{e.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseEventDateTime(e.start_time, e.date), "h:mm a")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(e)}
                      className="mt-2 min-h-11 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-[var(--deca-blue-dark)]"
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
