"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { CalendarDays } from "lucide-react";
import type { Event } from "@/lib/types";
import { getEventStartEnd } from "@/lib/utils";
import { EventModal } from "./event-modal";
import { EmptyState } from "@/components/ui/empty-state";

const FullCalendar = dynamic(
  () => import("@fullcalendar/react").then((mod) => mod.default),
  { ssr: false }
);

const CALENDAR_PLUGINS = [dayGridPlugin, interactionPlugin, listPlugin];

const EVENT_COLORS: Record<string, string> = {
  mandatory: "#0171BB",
  optional: "#60A5FA",
  social: "#C8A415",
  competition: "#004B87",
};

const EVENT_TYPES = [
  "meeting",
  "mcq_practice",
  "roleplay_practice",
  "workshop",
  "social",
  "fundraiser",
  "community_service",
  "competition",
  "other",
];

interface CalendarSectionProps {
  events: Event[];
  userId: string;
}

export function CalendarSection({
  events: dbEvents,
  userId,
}: CalendarSectionProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [mandatoryFilter, setMandatoryFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filteredEvents = useMemo(() => {
    return dbEvents.filter((e) => {
      if (eventTypeFilter !== "all" && e.event_type !== eventTypeFilter)
        return false;
      if (mandatoryFilter === "mandatory" && !e.is_mandatory) return false;
      if (mandatoryFilter === "optional" && e.is_mandatory) return false;
      return true;
    });
  }, [dbEvents, eventTypeFilter, mandatoryFilter]);

  const fcEvents = useMemo(
    () =>
      filteredEvents.map((e) => {
        const isMandatory = e.is_mandatory ?? false;
        const type = (e.event_type ?? "").toLowerCase();
        let color = EVENT_COLORS.optional;
        if (type === "social") color = EVENT_COLORS.social;
        else if (type === "competition") color = EVENT_COLORS.competition;
        else if (isMandatory) color = EVENT_COLORS.mandatory;
        const { start, end } = getEventStartEnd(e);

        return {
          id: e.id,
          title: e.title,
          start,
          end,
          backgroundColor: color,
          borderColor: color,
          extendedProps: { rawEvent: e },
        };
      }),
    [filteredEvents]
  );

  const handleEventClick = useCallback(
    (info: { event: { id: string; extendedProps?: { rawEvent?: Event } } }) => {
      const event =
        info.event.extendedProps?.rawEvent ??
        dbEvents.find((e) => e.id === info.event.id);
      if (event) setSelectedEvent(event);
    },
    [dbEvents]
  );

  const selectedEventData = selectedEvent
    ? { event: selectedEvent }
    : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="all">All event types</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </option>
          ))}
        </select>
        <select
          value={mandatoryFilter}
          onChange={(e) => setMandatoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="all">All (mandatory/optional)</option>
          <option value="mandatory">Mandatory only</option>
          <option value="optional">Optional only</option>
        </select>
      </div>

      {/* Calendar */}
      <div className="events-calendar rounded-xl border border-blue-50 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Your chapter calendar is empty. Events will appear here when they're scheduled."
          />
        ) : (
        <FullCalendar
          plugins={CALENDAR_PLUGINS}
          initialView={isMobile ? "listWeek" : "dayGridMonth"}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,listWeek",
          }}
          events={fcEvents}
          eventClick={handleEventClick}
          height="auto"
          views={{
            dayGridMonth: {
              titleFormat: { month: "long", year: "numeric" },
            },
            listWeek: {
              titleFormat: { month: "short", day: "numeric", year: "numeric" },
            },
          }}
          // Use list view on mobile (handled via CSS/media or view switching)
          eventDisplay="block"
        />
        )}
      </div>

      {selectedEventData && (
        <EventModal
          event={selectedEventData.event}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
