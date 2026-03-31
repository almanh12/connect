"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Check,
  X,
  Gift,
  Plus,
  BarChart3,
  Calendar,
  Send,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import {
  markAttendance,
  markAllAbsent,
  awardBonusPoints,
} from "./actions";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: "Meeting",
  mcq_practice: "MCQ Practice",
  roleplay_practice: "Roleplay",
  competition: "Competition",
  social: "Social",
  optional: "Optional",
};

const AWARD_PRESETS = [
  { points: 5, reason: "Helped setup" },
  { points: 10, reason: "Great participation" },
  { points: 20, reason: "Led the session" },
];

interface EventWithStats {
  id: string;
  title: string;
  date?: string | null;
  start_time: string;
  event_type: string | null;
  present_count: number;
  total_members: number;
  attendance_map: Record<string, boolean>;
  attendance_marked?: boolean | null;
  attendance_submitted_at?: string | null;
}

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface MemberRate {
  id: string;
  full_name: string | null;
  email: string | null;
  attended: number;
  total: number;
  rate: number;
}

interface AttendanceClientProps {
  events: EventWithStats[];
  eventsForAnalytics?: EventWithStats[];
  members: Member[];
  memberRates: MemberRate[];
}

export function AttendanceClient({
  events,
  eventsForAnalytics,
  members,
  memberRates,
}: AttendanceClientProps) {
  const router = useRouter();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [awardPopover, setAwardPopover] = useState<{
    userId: string;
    userName: string;
    x: number;
    y: number;
  } | null>(null);
  const [awardPoints, setAwardPoints] = useState("");
  const [awardReason, setAwardReason] = useState("");
  const [awardedUsers, setAwardedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"events" | "analytics">("events");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeIndex = activeTab === "events" ? 0 : 1;
    const el = tabRefs.current[activeIndex];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  const handleMarkAttendance = async (
    eventId: string,
    userId: string,
    attended: boolean
  ) => {
    const result = await markAttendance(eventId, userId, attended);
    if (result.error) toast.error(result.error);
    else {
      toast.success(attended ? "Marked present" : "Marked absent");
      router.refresh();
    }
  };

  const handleMarkAllPresent = async (eventId: string) => {
    for (const m of members) {
      await markAttendance(eventId, m.id, true);
    }
    toast.success("All marked present");
    setExpandedEvent(null);
    router.refresh();
  };

  const handleMarkAllAbsent = async (eventId: string) => {
    const result = await markAllAbsent(eventId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("All marked absent");
      setExpandedEvent(null);
      router.refresh();
    }
  };

  const handleAwardPoints = async (userId: string) => {
    const points = parseInt(awardPoints, 10);
    if (isNaN(points) || points <= 0) {
      toast.error("Enter valid points");
      return;
    }
    const result = await awardBonusPoints(userId, points, awardReason);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Awarded ${points} points`);
      setAwardedUsers((s) => new Set(s).add(userId));
      setAwardPopover(null);
      setAwardPoints("");
      setAwardReason("");
      router.refresh();
    }
  };

  const applyPreset = (preset: (typeof AWARD_PRESETS)[0]) => {
    setAwardPoints(String(preset.points));
    setAwardReason(preset.reason);
  };

  const exportCsv = () => {
    const headers = [
      "Event",
      "Date",
      "Present",
      "Total",
      "Rate",
    ];
    const rows = events.map((e) => [
      e.title,
      format(parseEventDateTime(e.start_time, e.date), "yyyy-MM-dd"),
      e.present_count,
      e.total_members,
      e.total_members > 0
        ? `${((e.present_count / e.total_members) * 100).toFixed(1)}%`
        : "0%",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const analyticsEvents = eventsForAnalytics ?? events;
  const attendanceOverTime = analyticsEvents
    .slice()
    .reverse()
    .map((e) => ({
      name: format(parseEventDateTime(e.start_time, e.date), "MMM d"),
      rate: e.total_members > 0 ? (e.present_count / e.total_members) * 100 : 0,
      present: e.present_count,
      total: e.total_members,
    }));

  const byEventType = analyticsEvents.reduce((acc, e) => {
    const type = e.event_type ?? "other";
    const label = EVENT_TYPE_LABELS[type] ?? type;
    if (!acc[label]) acc[label] = { present: 0, total: 0 };
    acc[label].present += e.present_count;
    acc[label].total += e.total_members;
    return acc;
  }, {} as Record<string, { present: number; total: number }>);

  const eventTypeData = Object.entries(byEventType).map(([name, v]) => ({
    name,
    rate: v.total > 0 ? (v.present / v.total) * 100 : 0,
    fill: "#0072CE",
  }));

  const perfectAttendance = memberRates.filter((m) => m.total > 0 && m.rate >= 100);
  const atRisk = memberRates.filter((m) => m.total >= 3 && m.rate < 50);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin" className="text-[#0072CE] hover:underline">
          ← Back
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Attendance Management
        </h1>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="tabs-with-indicator relative flex gap-2 border-b border-gray-200">
        <button
          ref={(el) => { tabRefs.current[0] = el; }}
          type="button"
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium transition ${
            activeTab === "events"
              ? "text-[#2563eb]"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Event Attendance
        </button>
        <button
          ref={(el) => { tabRefs.current[1] = el; }}
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium transition ${
            activeTab === "analytics"
              ? "text-[#2563eb]"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </button>
        <div
          className="tab-indicator"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      </div>

      {activeTab === "events" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Event
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Attendance
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Rate
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events
                .sort(
                  (a, b) =>
                    parseEventDateTime(b.start_time, b.date).getTime() -
                    parseEventDateTime(a.start_time, a.date).getTime()
                )
                .map((event) => {
                  const rate =
                    event.total_members > 0
                      ? (event.present_count / event.total_members) * 100
                      : 0;
                  const now = new Date();
                  const isPast = parseEventDateTime(event.start_time, event.date) < now;
                  const isLocked = !!(event.attendance_marked ?? event.attendance_submitted_at);
                  const status = !isPast
                    ? "upcoming"
                    : isLocked
                      ? "done"
                      : "needed";

                  return (
                    <tr
                      key={event.id}
                      className={`hover:bg-gray-50 ${
                        status === "needed"
                          ? "bg-[var(--warning-light)]/30"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {event.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(parseEventDateTime(event.start_time, event.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {status === "needed" ? (
                          <span className="font-medium text-[var(--warning)]">
                            ⚠ Not marked
                          </span>
                        ) : status === "done" ? (
                          <span className="text-[var(--success)]">
                            ✓ {event.present_count}/{event.total_members}
                          </span>
                        ) : (
                          <span className="text-gray-400">— Upcoming</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {status === "done" ? `${rate.toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {status === "needed" ? (
                          <Link
                            href={`/admin/attendance/${event.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--warning)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                          >
                            Mark →
                          </Link>
                        ) : status === "done" ? (
                          <Link
                            href={`/admin/attendance/${event.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--success)] hover:underline"
                          >
                            <Check className="h-4 w-4" />
                            View
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "events" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 hidden">
          {events.map((event) => {
            const isExpanded = expandedEvent === event.id;
            const rate =
              event.total_members > 0
                ? (event.present_count / event.total_members) * 100
                : 0;

            return (
              <div
                key={event.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedEvent(isExpanded ? null : event.id)
                  }
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {format(parseEventDateTime(event.start_time, event.date), "MMM d, yyyy")}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {EVENT_TYPE_LABELS[event.event_type ?? ""] ??
                          event.event_type ??
                          "Event"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {event.present_count}/{event.total_members}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rate.toFixed(0)}%
                    </p>
                    <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#0072CE] transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">
                        {event.present_count}/{event.total_members} present (
                        {rate.toFixed(0)}%)
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleMarkAllPresent(event.id)}
                          className="rounded-lg bg-[#0072CE] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#004B87]"
                        >
                          Mark All Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAllAbsent(event.id)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100"
                        >
                          Mark All Absent
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">
                              Member
                            </th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">
                              Status
                            </th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600">
                              Award
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => {
                            const attended =
                              event.attendance_map[member.id] ?? false;
                            return (
                              <tr
                                key={member.id}
                                className="border-t border-gray-100"
                              >
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar
                                      src={member.avatar_url}
                                      name={member.full_name}
                                      size="sm"
                                    />
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {member.full_name ?? "—"}
                                      </p>
                                      {awardedUsers.has(member.id) && (
                                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
                                          +Awarded
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMarkAttendance(
                                          event.id,
                                          member.id,
                                          true
                                        )
                                      }
                                      className={`rounded px-2 py-1 text-xs font-medium ${
                                        attended
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800"
                                      }`}
                                    >
                                      <Check className="inline h-3 w-3" /> Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMarkAttendance(
                                          event.id,
                                          member.id,
                                          false
                                        )
                                      }
                                      className={`rounded px-2 py-1 text-xs font-medium ${
                                        !attended
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-800"
                                      }`}
                                    >
                                      <X className="inline h-3 w-3" /> Absent
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        setAwardPopover({
                                          userId: member.id,
                                          userName: member.full_name ?? "Member",
                                          x: e.clientX,
                                          y: e.clientY,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-[#0072CE]/50 px-2 py-1 text-xs font-medium text-[#0072CE] hover:bg-[#0072CE]/10"
                                    >
                                      <Plus className="h-3 w-3" />
                                      Award
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-8">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">
              Attendance Rate Trend
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: unknown) => [`${Number(value).toFixed(0)}%`, "Rate"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#0072CE"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">
              Attendance by Event Type
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventTypeData} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: unknown) => [`${Number(value).toFixed(0)}%`, "Rate"]}
                  />
                  <Bar dataKey="rate" fill="#0072CE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900">
                Perfect Attendance
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Members who attended all events
              </p>
              <ul className="mt-4 space-y-2">
                {perfectAttendance.length === 0 ? (
                  <li className="text-sm text-gray-500">None yet</li>
                ) : (
                  perfectAttendance.slice(0, 10).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2"
                    >
                      <span className="font-medium text-gray-900">
                        {m.full_name ?? "—"}
                      </span>
                      <span className="text-sm text-green-700">
                        {m.attended}/{m.total}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900">
                At-Risk Members
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Members who may need a nudge
              </p>
              <ul className="mt-4 space-y-2">
                {atRisk.length === 0 ? (
                  <li className="text-sm text-gray-500">None</li>
                ) : (
                  atRisk.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2"
                    >
                      <span className="font-medium text-gray-900">
                        {m.full_name ?? "—"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-amber-700">
                          {m.rate.toFixed(0)}%
                        </span>
                        <Link
                          href={`/admin/members/${m.id}`}
                          className="flex items-center gap-1 rounded bg-amber-200 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300"
                        >
                          <Send className="h-3 w-3" />
                          Send Nudge
                        </Link>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {awardPopover &&
        createPortal(
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
              onClick={() => setAwardPopover(null)}
            />
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "80px 16px 16px",
                zIndex: 99999,
                pointerEvents: "none",
              }}
            >
              <div
                className="modal modal-content w-full max-w-sm sm:w-72 rounded-t-2xl sm:rounded-xl border border-gray-200 bg-white p-4 shadow-xl animate-modal-enter"
                style={{ pointerEvents: "auto" }}
                onClick={(e) => e.stopPropagation()}
              >
            <p className="text-sm font-medium text-gray-900">
              Award points to {awardPopover.userName}
            </p>
            <div className="mt-3 space-y-2">
              {AWARD_PRESETS.map((p) => (
                <button
                  key={p.reason}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-[#0072CE]">+{p.points}</span>{" "}
                  {p.reason}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <input
                type="number"
                min={1}
                value={awardPoints}
                onChange={(e) => setAwardPoints(e.target.value)}
                placeholder="Points"
                className="modal-input w-full rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={awardReason}
                onChange={(e) => setAwardReason(e.target.value)}
                placeholder="Reason"
                className="modal-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setAwardPopover(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAwardPoints(awardPopover.userId)}
                className="flex-1 rounded-lg bg-[#0072CE] py-2 text-sm font-semibold text-white"
              >
                Award
              </button>
            </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
