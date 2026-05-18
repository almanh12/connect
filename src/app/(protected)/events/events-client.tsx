"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { format } from "date-fns";
import { parseEventDateTime, getEventStartEnd, getEventDateKey } from "@/lib/utils";
import { createPortal } from "react-dom";
import { CalendarDays, List, MapPin, Pencil, Plus, Search, Trash2, Trophy, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FilterChips } from "@/components/ui/filter-chips";
import { EventRowActions } from "@/components/ui/event-row-actions";
import { CreateEventForm } from "@/app/(protected)/admin/events/create-event-form";
import { EventModal } from "@/app/(protected)/dashboard/event-modal";
import { CompetitionTab } from "@/app/(protected)/events/competition-tab";
import type { Event } from "@/lib/types";
import type FullCalendarComponent from "@fullcalendar/react";

/** next/dynamic strips `ref` from the component type; FullCalendar supports refs for the calendar API. */
const FullCalendar = dynamic(
  () => import("@fullcalendar/react").then((mod) => mod.default),
  { ssr: false }
) as typeof FullCalendarComponent;

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: "Meeting",
  mcq_practice: "MCQ Practice",
  roleplay_practice: "Roleplay Practice",
  workshop: "Workshop",
  social: "Social",
  fundraiser: "Fundraiser",
  community_service: "Community Service",
  competition: "Competition Prep",
  other: "Other",
};

/** Event type colors for date chip border (upcoming only) */
const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting: "#00539B",
  competition: "#C5A248",
  mcq_practice: "#C5A248",
  roleplay_practice: "#C5A248",
  social: "#059669",
  fundraiser: "#DC2626",
  workshop: "#7C3AED",
  community_service: "#059669",
  other: "#6B7280",
};

/** Pill badge: { color, bg } for each type */
const EVENT_TYPE_PILLS: Record<string, { color: string; bg: string }> = {
  meeting: { color: "#00539B", bg: "#E8F1FA" },
  competition: { color: "#C5A248", bg: "#F5EDD4" },
  mcq_practice: { color: "#C5A248", bg: "#F5EDD4" },
  roleplay_practice: { color: "#C5A248", bg: "#F5EDD4" },
  social: { color: "#059669", bg: "#ECFDF5" },
  fundraiser: { color: "#DC2626", bg: "#FEF2F2" },
  workshop: { color: "#7C3AED", bg: "#F5F3FF" },
  community_service: { color: "#059669", bg: "#ECFDF5" },
  other: { color: "#6B7280", bg: "#F3F4F6" },
};

interface EventWithMeta extends Event {
  attended_count?: number;
  total_members?: number;
  has_attendance_marked?: boolean;
}

interface CompetitionRegistration {
  id: string;
  user_id: string;
  event_code: string;
  event_name: string;
  competition_level: string;
  status: string;
  partner_id: string | null;
  created_at: string;
}

interface ChapterMember {
  id: string;
  full_name: string | null;
}

interface EventsClientProps {
  events: EventWithMeta[];
  isAdmin?: boolean;
  userId?: string;
  rsvpEventIds?: string[];
  competitionRegistrations?: CompetitionRegistration[];
  chapterMembers?: ChapterMember[];
}


function EventListRow({
  event,
  isAdmin,
  onRowClick,
  onEdit,
  onDelete,
}: {
  event: EventWithMeta;
  isAdmin: boolean;
  onRowClick: (event: EventWithMeta, isPast: boolean) => void;
  onEdit?: (event: EventWithMeta) => void;
  onDelete?: (event: EventWithMeta) => void;
}) {
  const typeLabel = EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type ?? "Event";
  const typeColor = EVENT_TYPE_COLORS[event.event_type ?? ""] ?? "#6B7280";
  const pill = EVENT_TYPE_PILLS[event.event_type ?? ""] ?? { color: "#6B7280", bg: "#F3F4F6" };
  const startDate = parseEventDateTime(event.start_time, event.date);
  const now = new Date();
  const isPast = startDate < now;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRowClick(event, isPast)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick(event, isPast);
        }
      }}
      className={`flex cursor-pointer items-center gap-4 border-b border-[var(--gray-100)] py-4 pl-4 pr-4 transition-colors duration-150 last:border-0 hover:bg-[var(--gray-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-inset focus-visible:ring-offset-0 ${isPast ? "opacity-75" : ""}`}
    >
      {/* Column A: Date badge */}
      <div
        className="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)]"
        style={
          isPast
            ? { backgroundColor: "var(--gray-100)", border: "1px solid #C8CDD5" }
            : { backgroundColor: "var(--deca-blue-light)", borderLeft: `3px solid ${typeColor}` }
        }
      >
        <span
          className="font-gotham text-[10px] font-medium uppercase"
          style={{ color: isPast ? "#6B7280" : "var(--deca-blue)" }}
        >
          {format(startDate, "MMM")}
        </span>
        <span
          className="font-gotham text-[22px] font-bold leading-none"
          style={{ color: isPast ? "#6B7280" : "var(--deca-blue)" }}
        >
          {format(startDate, "d")}
        </span>
      </div>
      {/* Column B: Title + metadata */}
      <div className="min-w-0 flex-1 overflow-visible">
        <p className={`text-sm font-medium ${isPast ? "text-[var(--gray-600)]" : "text-[var(--gray-900)]"}`}>
          {event.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--gray-500)]">
          <span
            className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: pill.bg, color: pill.color }}
          >
            {typeLabel}
          </span>
          <span>·</span>
          <span>{format(startDate, "h:mm a")}</span>
          {event.is_mandatory && (
            <>
              <span>·</span>
              <span>Mandatory</span>
            </>
          )}
        </p>
      </div>
      {/* Column C: Right meta/action area */}
      <EventRowActions
        event={event}
        isAdmin={isAdmin}
        isPast={isPast}
        onRowClick={onRowClick}
        onEdit={onEdit ? () => onEdit(event) : undefined}
        onDelete={onDelete ? () => onDelete(event) : undefined}
      />
    </div>
  );
}

function PastEventModal({
  event,
  onClose,
  onEdit,
  onDelete,
}: {
  event: EventWithMeta;
  onClose: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const startDate = parseEventDateTime(event.start_time, event.date);
  const endDate = parseEventDateTime(event.end_time, event.date);
  const typeLabel = EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type ?? "Event";

  const modalContent = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div
          className="modal-content w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-[var(--gray-200)] bg-white shadow-xl flex flex-col sm:max-h-[90vh] animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--gray-200)] p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--gray-900)]">{event.title}</h2>
            <p className="mt-1 text-sm text-[var(--gray-500)]">
              <span className="rounded-full bg-[var(--gray-100)] px-2 py-0.5 text-xs font-medium text-[var(--gray-600)]">
                {typeLabel}
              </span>
              {" · "}
              {format(startDate, "EEE, MMM d")} · {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
            </p>
            {event.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--gray-500)]">
                <MapPin className="h-4 w-4 shrink-0" />
                {event.location}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--gray-400)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-600)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {event.description && (
            <p className="text-[var(--gray-600)]">{event.description}</p>
          )}
          <div className="mt-6 flex gap-2 justify-end">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-2 rounded-lg border border-[#E2E5EA] bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-2 rounded-lg border border-[#E2E5EA] bg-transparent px-4 py-2.5 text-sm font-medium text-[#DC2626] transition hover:bg-[var(--gray-50)]"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

function EditRecurringDialog({
  event,
  onClose,
  onEditThisOnly,
  onEditAllInSeries,
}: {
  event: EventWithMeta;
  onClose: () => void;
  onEditThisOnly: () => void;
  onEditAllInSeries: () => void;
}) {
  const modalContent = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div
          className="modal-content w-full max-w-md rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-xl animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
        <h3 className="text-lg font-semibold text-[var(--gray-900)]">Edit recurring event</h3>
        <p className="mt-2 text-sm text-[var(--gray-600)]">
          &quot;{event.title}&quot; is part of a recurring series. Edit this event only or all events in the series?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--gray-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onEditThisOnly}
            className="rounded-lg border border-[var(--deca-blue)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--deca-blue)] hover:bg-[var(--deca-blue-light)]"
          >
            Edit this event only
          </button>
          <button
            type="button"
            onClick={onEditAllInSeries}
            className="rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--deca-blue-dark)]"
          >
            Edit all in series
          </button>
        </div>
      </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

function DeleteEventConfirmModal({
  event,
  onClose,
  onConfirm,
  onConfirmSeries,
}: {
  event: EventWithMeta;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onConfirmSeries?: (recurringGroupId: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isRecurring = !!event.recurring_group_id;

  const handleConfirm = async (series: boolean) => {
    setIsDeleting(true);
    try {
      if (series && event.recurring_group_id && onConfirmSeries) {
        await onConfirmSeries(event.recurring_group_id);
      } else {
        await onConfirm();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const modalContent = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div
          className="modal-content w-full max-w-md rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-xl animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
        <h3 className="text-lg font-semibold text-[var(--gray-900)]">Delete event?</h3>
        <p className="mt-2 text-sm text-[var(--gray-600)]">
          Delete &quot;{event.title}&quot;? This action cannot be undone.
        </p>
        {isRecurring && onConfirmSeries && (
          <p className="mt-2 text-sm text-[var(--gray-500)]">
            This is a recurring event. Delete this instance only or all events in the series?
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--gray-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
          >
            Cancel
          </button>
          {isRecurring && onConfirmSeries && (
            <button
              type="button"
              onClick={() => handleConfirm(true)}
              disabled={isDeleting}
              className="rounded-lg border border-[#DC2626] bg-transparent px-4 py-2 text-sm font-medium text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete all in series"}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleConfirm(false)}
            disabled={isDeleting}
            className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-medium text-white hover:bg-[#B91C1C] disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : isRecurring ? "Delete this event only" : "Delete"}
          </button>
        </div>
      </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

function DayDetailsPanel({
  selectedDate,
  events,
  onEventClick,
  onCreateClick,
  onClose,
  isAdmin,
}: {
  selectedDate: string;
  events: EventWithMeta[];
  onEventClick: (event: EventWithMeta, isPast: boolean) => void;
  onCreateClick: () => void;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const dayEvents = useMemo(() => {
    const key = selectedDate;
    return events.filter((e) => getEventDateKey(e) === key);
  }, [events, selectedDate]);

  const parsed = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);
  const now = new Date();

  return (
    <div className="flex flex-col rounded-[18px] border border-[var(--gray-200)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--gray-200)] px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--gray-600)]">
          {format(parsed, "EEEE, MMM d")}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-[var(--gray-400)] transition hover:bg-[var(--gray-100)] hover:text-[var(--gray-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
          aria-label="Close day details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-[var(--gray-500)]">No events for this day</p>
            {isAdmin && (
              <button
                type="button"
                onClick={onCreateClick}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--deca-blue-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
              >
                <Plus className="h-4 w-4" />
                Create event
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {dayEvents.map((event) => {
              const startDate = parseEventDateTime(event.start_time, event.date);
              const isPast = startDate < now;
              const pill = EVENT_TYPE_PILLS[event.event_type ?? ""] ?? { color: "#6B7280", bg: "#F3F4F6" };
              const typeLabel = EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type ?? "Event";
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onEventClick(event, isPast)}
                    className="flex w-full flex-col items-start gap-1 rounded-lg border border-[var(--gray-200)] bg-white px-3 py-2.5 text-left transition hover:bg-[var(--gray-50)] hover:border-[var(--deca-blue-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
                  >
                    <span className="text-sm font-medium text-[var(--gray-900)]">{event.title}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--gray-500)]">
                      <span>{format(startDate, "h:mm a")}</span>
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: pill.bg, color: pill.color }}
                      >
                        {typeLabel}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyEventsState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--deca-blue-muted)]/20">
        <CalendarDays className="h-8 w-8 text-[var(--deca-blue-muted)]" strokeWidth={1.5} />
      </div>
      <p className="text-base font-medium text-[var(--gray-700)]">No upcoming events</p>
      <p className="max-w-[320px] text-sm text-[var(--gray-500)]">
        Events will appear here once an admin creates them.
      </p>
      <Link
        href="/events"
        className="rounded-[var(--radius-sm)] bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--deca-blue-dark)]"
      >
        View All Events
      </Link>
    </div>
  );
}

export function EventsClient({
  events,
  isAdmin = false,
  userId = "",
  rsvpEventIds = [],
  competitionRegistrations = [],
  chapterMembers = [],
}: EventsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [mainTab, setMainTab] = useState<"events" | "competition">(
    tabParam === "competition" ? "competition" : "events"
  );

  useEffect(() => {
    if (tabParam === "competition" && mainTab !== "competition") {
      setMainTab("competition");
    }
  }, [tabParam, mainTab]);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createPanelDefaultDate, setCreatePanelDefaultDate] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<EventWithMeta | null>(null);

  const [eventToEdit, setEventToEdit] = useState<EventWithMeta | null>(null);
  const [editSeries, setEditSeries] = useState(false);
  const [pastEventModal, setPastEventModal] = useState<EventWithMeta | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<EventWithMeta | null>(null);
  const [editRecurringEvent, setEditRecurringEvent] = useState<EventWithMeta | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<"dayGridMonth" | "listWeek">("dayGridMonth");
  const calendarRef = useRef<FullCalendarComponent | null>(null);
  const [calendarTitle, setCalendarTitle] = useState("");

  const openCreatePanel = useCallback((date?: string) => {
    setEventToEdit(null);
    setCreatePanelDefaultDate(date);
    setShowCreatePanel(true);
  }, []);

  const openEditPanel = useCallback((event: EventWithMeta, series = false) => {
    setEventToEdit(event);
    setEditSeries(series);
    setCreatePanelDefaultDate(undefined);
    setShowCreatePanel(true);
  }, []);

  const closeCreatePanel = useCallback(() => {
    setShowCreatePanel(false);
    setCreatePanelDefaultDate(undefined);
    setEventToEdit(null);
    setEditSeries(false);
  }, []);

  const handleEditClick = useCallback(
    (event: EventWithMeta) => {
      if (event.recurring_group_id) {
        setEditRecurringEvent(event);
      } else {
        openEditPanel(event);
      }
    },
    [openEditPanel]
  );

  const handleEditRecurringChoice = useCallback(
    (choice: "this" | "series") => {
      const event = editRecurringEvent;
      setEditRecurringEvent(null);
      if (event) {
        openEditPanel(event, choice === "series");
      }
    },
    [editRecurringEvent, openEditPanel]
  );

  const handleCreateSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleRowClick = useCallback(
    (event: EventWithMeta, isPast: boolean) => {
      if (!isAdmin) {
        router.push(`/events/${event.id}`);
        return;
      }
      if (isPast) {
        setPastEventModal(event);
      } else {
        openEditPanel(event);
      }
    },
    [isAdmin, router, openEditPanel]
  );

  const now = new Date();
  const upcomingEvents = events.filter((e) => parseEventDateTime(e.start_time, e.date) >= now);
  const pastEvents = events.filter((e) => parseEventDateTime(e.start_time, e.date) < now);

  const filteredEvents = useMemo(() => {
    let list = filter === "upcoming" ? upcomingEvents : filter === "past" ? pastEvents : events;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (EVENT_TYPE_LABELS[e.event_type ?? ""] ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter && typeFilter !== "") {
      list = list.filter((e) => (e.event_type ?? "") === typeFilter);
    }
    const parse = (e: EventWithMeta) => parseEventDateTime(e.start_time, e.date).getTime();
    if (filter === "upcoming") {
      return [...list].sort((a, b) => parse(a) - parse(b));
    }
    if (filter === "past") {
      return [...list].sort((a, b) => parse(b) - parse(a));
    }
    return [...list].sort((a, b) => parse(b) - parse(a));
  }, [events, filter, search, typeFilter, upcomingEvents, pastEvents]);

  const typeFilterOptions = useMemo(() => {
    const types = new Set<string>();
    events.forEach((e) => {
      const t = e.event_type ?? "";
      if (t && EVENT_TYPE_LABELS[t]) types.add(t);
    });
    const typeOptions = Array.from(types).map((t) => ({
      value: t,
      label: EVENT_TYPE_LABELS[t] ?? t,
    }));
    if (typeOptions.length === 0) return [];
    return [{ value: "", label: "All" }, ...typeOptions];
  }, [events]);

  const fcEvents = useMemo(
    () =>
      events.map((e) => {
        const type = (e.event_type ?? "").toLowerCase();
        const color = EVENT_TYPE_COLORS[type] ?? "var(--deca-blue)";
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
    [events]
  );

  const handleEventClick = useCallback(
    (info: { event: { id: string; extendedProps?: { rawEvent?: EventWithMeta } }; jsEvent?: { preventDefault: () => void } }) => {
      info.jsEvent?.preventDefault();
      const event =
        info.event.extendedProps?.rawEvent ??
        events.find((e) => e.id === info.event.id);
      if (event) setSelectedEvent(event);
    },
    [events]
  );

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (api && calendarViewMode) api.changeView(calendarViewMode);
  }, [calendarViewMode]);

  const handleCalendarDateClick = useCallback(
    (arg: { dateStr: string }) => {
      setSelectedDate(arg.dateStr);
      if (isAdmin) openCreatePanel(arg.dateStr);
    },
    [isAdmin, openCreatePanel]
  );

  return (
    <>
      <PageHeader
        title="Events"
        description="View and manage chapter events"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              className="flex rounded-lg border border-[var(--gray-200)] p-1"
              aria-label="Main view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === "events"}
                onClick={() => setMainTab("events")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  mainTab === "events"
                    ? "bg-[var(--deca-blue)] text-white"
                    : "text-[var(--gray-600)] hover:bg-[var(--gray-50)]"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Events
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === "competition"}
                onClick={() => setMainTab("competition")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  mainTab === "competition"
                    ? "bg-[var(--deca-blue)] text-white"
                    : "text-[var(--gray-600)] hover:bg-[var(--gray-50)]"
                }`}
              >
                <Trophy className="h-4 w-4" />
                Competition
              </button>
            </div>
            {mainTab === "events" && (
              <>
                <SegmentedControl
                  options={[
                    { value: "list", label: "List", icon: <List className="h-4 w-4" /> },
                    { value: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
                  ]}
                  value={viewMode}
                  onChange={setViewMode}
                  aria-label="View mode"
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openCreatePanel()}
                    className="header-create-btn inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--deca-blue)] text-white text-[14px] font-medium rounded-lg border-none cursor-pointer transition hover:bg-[var(--deca-blue-dark)]"
                  >
                    <Plus className="h-4 w-4" />
                    Create Event
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {mainTab === "competition" ? (
        <div className="animate-fade-in-up">
          <CompetitionTab
            userId={userId}
            isAdmin={isAdmin}
            chapterMembers={chapterMembers}
            initialRegistrations={competitionRegistrations}
          />
        </div>
      ) : (
      <div className="space-y-4">
        {/* Filter bar: tabs + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Filter events by time"
            className="flex items-center gap-1 border-b border-[var(--gray-200)]"
          >
            {(["all", "upcoming", "past"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                aria-label={f === "all" ? `All events (${events.length})` : f === "upcoming" ? `Upcoming (${upcomingEvents.length})` : `Past (${pastEvents.length})`}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 ${
                  filter === f
                    ? "border-b-2 border-[var(--deca-blue)] text-[var(--deca-blue)]"
                    : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
                }`}
              >
                {f === "all" && `All (${events.length})`}
                {f === "upcoming" && `Upcoming (${upcomingEvents.length})`}
                {f === "past" && `Past (${pastEvents.length})`}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-[280px]">
            <label htmlFor="events-search" className="sr-only">
              Search events by title or type
            </label>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none"
              aria-hidden
            />
            <input
              type="search"
              id="events-search"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search events by title or type"
              autoComplete="off"
              className="w-full rounded-lg border border-[var(--gray-200)] bg-white py-2.5 pl-10 pr-10 text-sm text-[var(--gray-700)] placeholder:text-[var(--gray-400)] transition-colors focus:border-[var(--deca-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--deca-blue)] focus:ring-offset-0"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--gray-400)] transition-colors hover:bg-[var(--gray-100)] hover:text-[var(--gray-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Filter chips by event type — under tabs */}
        {typeFilterOptions.length > 0 && (
          <FilterChips
            options={typeFilterOptions}
            value={typeFilter ?? ""}
            onChange={(v) => setTypeFilter(v === "" ? null : v)}
            aria-label="Filter by event type"
          />
        )}

        {viewMode === "list" ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white shadow-[var(--shadow-card)]">
            {filteredEvents.length === 0 ? (
              <EmptyEventsState />
            ) : (
              <div className="divide-y divide-[var(--gray-100)] px-4">
                {filteredEvents.map((event) => (
                  <EventListRow
                    key={event.id}
                    event={event}
                    isAdmin={isAdmin ?? false}
                    onRowClick={handleRowClick}
                    onEdit={isAdmin ? handleEditClick : undefined}
                    onDelete={
                      isAdmin
                        ? (e) => setDeleteConfirmEvent(e)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div
              className={`events-calendar flex-1 min-w-0 rounded-[18px] border border-[var(--gray-200)] bg-white p-4 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden ${
                isAdmin ? "calendar-admin" : ""
              }`}
            >
              {/* Custom header: prev, next, today, title, Month/List segmented control */}
              <div className="events-calendar-header mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gray-200)] pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => calendarRef.current?.getApi?.().prev()}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--gray-200)] bg-white text-[var(--gray-600)] transition hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
                    aria-label="Previous month"
                  >
                    <span className="text-lg leading-none">‹</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => calendarRef.current?.getApi?.().next()}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--gray-200)] bg-white text-[var(--gray-600)] transition hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
                    aria-label="Next month"
                  >
                    <span className="text-lg leading-none">›</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      calendarRef.current?.getApi?.().today();
                      setSelectedDate(format(now, "yyyy-MM-dd"));
                    }}
                    className="rounded-lg border border-[var(--gray-200)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
                  >
                    Today
                  </button>
                </div>
                <h2 className="text-base font-semibold text-[var(--gray-900)]" id="calendar-title">
                  {calendarTitle || "Calendar"}
                </h2>
                <SegmentedControl<"dayGridMonth" | "listWeek">
                  options={[
                    { value: "dayGridMonth", label: "Month", icon: <CalendarDays className="h-4 w-4" /> },
                    { value: "listWeek", label: "List", icon: <List className="h-4 w-4" /> },
                  ]}
                  value={calendarViewMode}
                  onChange={(v) => setCalendarViewMode(v)}
                  aria-label="Calendar view"
                />
              </div>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                initialView={calendarViewMode}
                headerToolbar={false}
                events={fcEvents}
                eventClick={handleEventClick}
                dateClick={handleCalendarDateClick}
                dayCellDidMount={(arg) => {
                  if (isAdmin && arg.el && !arg.isOther) {
                    const indicator = document.createElement("div");
                    indicator.className = "date-add-indicator";
                    indicator.textContent = "+";
                    indicator.setAttribute("aria-hidden", "true");
                    arg.el.style.position = "relative";
                    arg.el.appendChild(indicator);
                  }
                }}
                height="auto"
                dayMaxEvents={2}
                moreLinkContent={(args) => `+${args.num}`}
                dayCellClassNames={(arg) => {
                  const classes: string[] = [];
                  const dateStr = format(arg.date, "yyyy-MM-dd");
                  if (dateStr === format(now, "yyyy-MM-dd")) classes.push("fc-day-today");
                  if (selectedDate && dateStr === selectedDate) classes.push("fc-day-selected");
                  if (isAdmin || !arg.isOther) classes.push("cursor-pointer");
                  return classes;
                }}
                datesSet={(arg) => {
                  setCalendarTitle(arg.view.title);
                  const vt = arg.view.type as "dayGridMonth" | "listWeek";
                  if (vt === "dayGridMonth" || vt === "listWeek") setCalendarViewMode(vt);
                }}
              />
            </div>
            {selectedDate && (
              <aside className="w-full lg:w-[320px] lg:min-w-[320px] shrink-0">
                <DayDetailsPanel
                  selectedDate={selectedDate}
                  events={events}
                  onEventClick={handleRowClick}
                  onCreateClick={() => openCreatePanel(selectedDate)}
                  onClose={() => setSelectedDate(null)}
                  isAdmin={isAdmin ?? false}
                />
              </aside>
            )}
          </div>
        )}
      </div>
      )}

      {showCreatePanel && isAdmin && (
        <CreateEventForm
          onClose={closeCreatePanel}
          onSuccess={handleCreateSuccess}
          defaultDate={createPanelDefaultDate}
          initialEvent={eventToEdit}
          editSeries={editSeries}
        />
      )}

      {editRecurringEvent && isAdmin && (
        <EditRecurringDialog
          event={editRecurringEvent}
          onClose={() => setEditRecurringEvent(null)}
          onEditThisOnly={() => handleEditRecurringChoice("this")}
          onEditAllInSeries={() => handleEditRecurringChoice("series")}
        />
      )}

      {pastEventModal && isAdmin && (
        <PastEventModal
          event={pastEventModal}
          onClose={() => setPastEventModal(null)}
          onEdit={() => {
            const event = pastEventModal;
            setPastEventModal(null);
            handleEditClick(event);
          }}
          onDelete={() => {
            setPastEventModal(null);
            setDeleteConfirmEvent(pastEventModal);
          }}
        />
      )}

      {deleteConfirmEvent && (
        <DeleteEventConfirmModal
          event={deleteConfirmEvent}
          onClose={() => setDeleteConfirmEvent(null)}
          onConfirm={async () => {
            const { deleteEvent } = await import("@/app/(protected)/admin/events/actions");
            const result = await deleteEvent(deleteConfirmEvent.id);
            if (result?.error) {
              const { toast } = await import("sonner");
              toast.error(result.error);
            } else {
              setDeleteConfirmEvent(null);
              router.refresh();
            }
          }}
          onConfirmSeries={
            deleteConfirmEvent.recurring_group_id
              ? async (recurringGroupId) => {
                  const { deleteEventSeries } = await import("@/app/(protected)/admin/events/actions");
                  const result = await deleteEventSeries(recurringGroupId);
                  if (result?.error) {
                    const { toast } = await import("sonner");
                    toast.error(result.error);
                  } else {
                    setDeleteConfirmEvent(null);
                    router.refresh();
                  }
                }
              : undefined
          }
        />
      )}

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          hasRsvp={rsvpEventIds.includes(selectedEvent.id)}
          isPast={
            parseEventDateTime(selectedEvent.start_time, selectedEvent.date) <
            new Date()
          }
          onClose={() => setSelectedEvent(null)}
          isAdmin={isAdmin}
          onEdit={() => {
            const event = selectedEvent;
            setSelectedEvent(null);
            handleEditClick(event);
          }}
          onDelete={() => {
            setSelectedEvent(null);
            setDeleteConfirmEvent(selectedEvent);
          }}
        />
      )}
    </>
  );
}
