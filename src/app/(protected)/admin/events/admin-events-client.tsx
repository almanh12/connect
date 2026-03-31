"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import { CreateEventForm } from "./create-event-form";
import { AttendanceView } from "./attendance-view";
import { DeleteEventDialog } from "./delete-event-dialog";
import { createClient } from "@/lib/supabase/client";

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: "Meeting",
  mcq_practice: "MCQ Practice",
  roleplay_practice: "Roleplay Practice",
  workshop: "Workshop",
  social: "Social",
  fundraiser: "Fundraiser",
  community_service: "Community Service",
  competition: "Competition",
};

interface EventWithCounts {
  id: string;
  title: string;
  description: string | null;
  date?: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  event_type: string | null;
  is_mandatory: boolean | null;
  rsvp_count: number;
  attended_count: number;
  total_members?: number;
  attendance_status?: "needed" | "done" | "upcoming";
}

interface AdminEventsClientProps {
  events: EventWithCounts[];
  userId: string;
}

export function AdminEventsClient({
  events: initialEvents,
  userId,
}: AdminEventsClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTime, setFilterTime] = useState<"all" | "upcoming" | "past">(
    "all"
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [attendanceEvent, setAttendanceEvent] = useState<EventWithCounts | null>(
    null
  );
  const [attendanceData, setAttendanceData] = useState<
    { id: string; user_id: string; attended: boolean; checked_in_at: string | null; profile: { full_name: string | null; email: string | null } | null }[]
  >([]);
  const [deleteEvent, setDeleteEvent] = useState<EventWithCounts | null>(null);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    let result = [...events];

    if (filterTime === "upcoming") {
      result = result.filter((e) => parseEventDateTime(e.start_time, e.date) >= now);
    } else if (filterTime === "past") {
      result = result.filter((e) => parseEventDateTime(e.start_time, e.date) < now);
    }

    if (filterType !== "all") {
      result = result.filter((e) => e.event_type === filterType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false)
      );
    }

    if (sortBy === "date") {
      result.sort(
        (a, b) =>
          parseEventDateTime(b.start_time, b.date).getTime() -
          parseEventDateTime(a.start_time, a.date).getTime()
      );
    } else {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [events, filterTime, filterType, search, sortBy]);

  const fetchAttendance = async (eventId: string) => {
    const supabase = createClient();
    const { data: attData } = await supabase
      .from("attendance")
      .select("id, user_id, attended, checked_in_at")
      .eq("event_id", eventId);

    if (!attData?.length) {
      setAttendanceData([]);
      return;
    }

    const userIds = [...new Set(attData.map((a) => a.user_id))];
    const { data: profData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profMap = Object.fromEntries(
      (profData ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
    );

    const rows = attData.map((a) => ({
      ...a,
      profile: profMap[a.user_id] ?? null,
    }));
    setAttendanceData(rows);
  };

  const openAttendance = (event: EventWithCounts) => {
    setAttendanceEvent(event);
    fetchAttendance(event.id);
  };

  const refreshEvents = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="mt-1 text-gray-600">
            Create and manage chapter events
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2.5 font-semibold text-white hover:bg-[#004B87]"
        >
          <Plus className="h-5 w-5" />
          Create Event
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          />
        </div>
        <select
          value={filterTime}
          onChange={(e) =>
            setFilterTime(e.target.value as "all" | "upcoming" | "past")
          }
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
        >
          <option value="all">All events</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
        >
          <option value="all">All types</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date" | "title")}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
        >
          <option value="date">Sort by date</option>
          <option value="title">Sort by title</option>
        </select>
      </div>

      {/* Mobile: event cards */}
      <div className="md:hidden space-y-4">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-gray-900">{event.title}</p>
            <p className="mt-1 text-sm text-gray-500">
              {EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type} ·{" "}
              {format(parseEventDateTime(event.start_time, event.date), "MMM d, h:mm a")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  event.is_mandatory ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                }`}
              >
                {event.is_mandatory ? "Yes" : "No"} mandatory
              </span>
              <span className="text-sm text-gray-600">
                {event.rsvp_count} RSVPs · {event.attended_count} attended
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => openAttendance(event)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                title="View Attendance"
              >
                <Users className="h-5 w-5" />
              </button>
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                title="Edit"
              >
                <Pencil className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => setDeleteEvent(event)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
        {filteredEvents.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-500">
            No events found
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Title
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Type
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Date
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Mandatory?
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                RSVPs
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Attendance
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEvents.map((event) => (
              <tr
                key={event.id}
                className={`hover:bg-gray-50 ${
                  event.attendance_status === "needed"
                    ? "bg-[var(--warning-light)]/30"
                    : ""
                }`}
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{event.title}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {format(parseEventDateTime(event.start_time, event.date), "MMM d, yyyy · h:mm a")}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      event.is_mandatory
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {event.is_mandatory ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {event.rsvp_count}
                </td>
                <td className="px-6 py-4 text-sm">
                  {event.attendance_status === "needed" ? (
                    <span className="font-medium text-[var(--warning)]">⚠ Needed</span>
                  ) : event.attendance_status === "done" ? (
                    <span className="text-[var(--success)]">
                      ✓ {event.attended_count}/{event.total_members ?? 0}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {event.attendance_status === "needed" ? (
                      <Link
                        href={`/admin/attendance/${event.id}`}
                        className="rounded-lg bg-[var(--warning)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                      >
                        Mark
                      </Link>
                    ) : event.attendance_status === "done" ? (
                      <button
                        type="button"
                        onClick={() => openAttendance(event)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-[#0072CE]"
                        title="Edit Attendance"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                    ) : null}
                    <Link
                      href={`/admin/events/${event.id}/edit`}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-[#0072CE]"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteEvent(event)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEvents.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No events found
          </div>
        )}
      </div>

      {showCreate && (
        <CreateEventForm
          onClose={() => setShowCreate(false)}
          onSuccess={refreshEvents}
        />
      )}

      {attendanceEvent && (
        <AttendanceView
          event={attendanceEvent}
          attendance={attendanceData}
          onClose={() => {
            setAttendanceEvent(null);
            setAttendanceData([]);
          }}
          onUpdate={() => fetchAttendance(attendanceEvent.id)}
        />
      )}

      {deleteEvent && (
        <DeleteEventDialog
          event={deleteEvent}
          onClose={() => setDeleteEvent(null)}
          onSuccess={refreshEvents}
        />
      )}
    </div>
  );
}
