"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import { ArrowLeft, Search, Check } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { saveBulkAttendance } from "../actions";
import { toast } from "sonner";

interface Member {
  id: string;
  full_name: string | null;
  grade: number | null;
  avatar_url?: string | null;
}

interface Event {
  id: string;
  title: string;
  date?: string | null;
  start_time: string;
}

interface MarkAttendanceClientProps {
  event: Event;
  members: Member[];
  initialChecked: Set<string>;
  hasExistingAttendance: boolean;
  attendanceLocked: boolean;
}

export function MarkAttendanceClient({
  event,
  members,
  initialChecked,
  hasExistingAttendance,
  attendanceLocked,
}: MarkAttendanceClientProps) {
  const [checked, setChecked] = useState<Set<string>>(initialChecked);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const presentCount = checked.size;
  const totalCount = members.length;
  const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

  const filteredMembers = members.filter((m) => {
    const name = (m.full_name ?? "").toLowerCase();
    return name.includes(search.toLowerCase().trim());
  });

  const toggle = useCallback((userId: string) => {
    if (attendanceLocked) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setHasChanges(true);
  }, [attendanceLocked]);

  const selectAll = useCallback(() => {
    if (attendanceLocked) return;
    setChecked(new Set(members.map((m) => m.id)));
    setHasChanges(true);
  }, [members, attendanceLocked]);

  const deselectAll = useCallback(() => {
    if (attendanceLocked) return;
    setChecked(new Set());
    setHasChanges(true);
  }, [attendanceLocked]);

  const handleSave = async () => {
    const selectedMemberIds = [...checked];
    // Debug: verify checkbox state matches what gets sent
    console.log("[MarkAttendance] selectedMemberIds RIGHT BEFORE save:", {
      type: typeof selectedMemberIds,
      isArray: Array.isArray(selectedMemberIds),
      length: selectedMemberIds.length,
      ids: selectedMemberIds,
      sampleType: selectedMemberIds[0] ? typeof selectedMemberIds[0] : "n/a",
    });
    setIsSaving(true);
    const result = await saveBulkAttendance(event.id, selectedMemberIds);
    setIsSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Attendance saved. 10 points awarded to ${result.awardedCount ?? presentCount} members.`
    );
    setHasChanges(false);
    window.location.href = "/admin/attendance";
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/attendance"
          className="text-[var(--deca-blue)] hover:underline"
        >
          ← Back
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[var(--gray-900)]">
          Mark Attendance
        </h1>
        <p className="mt-1 text-sm text-[var(--gray-500)]">
          {event.title} — {format(parseEventDateTime(event.start_time, event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </p>
        {attendanceLocked ? (
          <p className="mt-2 text-sm font-medium text-[var(--success)]">
            Attendance has been recorded for this event. View only.
          </p>
        ) : hasExistingAttendance && (
          <p className="mt-2 text-xs text-[var(--gray-500)]">
            Attendance was previously recorded. You can modify it.
          </p>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Roster — 8 cols */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
            <div className="p-4 border-b border-[var(--gray-100)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  type="search"
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--gray-200)] py-2 pl-10 pr-4 text-sm focus:border-[var(--deca-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--deca-blue)]"
                />
              </div>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {filteredMembers.map((member) => {
                const isChecked = checked.has(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggle(member.id)}
                    className={`roster-row flex items-center gap-3 px-4 py-3 border-b border-[var(--gray-100)] transition-colors ${
                      attendanceLocked ? "cursor-default" : "cursor-pointer hover:bg-[var(--gray-50)]"
                    } ${isChecked ? "bg-[var(--deca-blue-light)]" : ""}`}
                  >
                    <div
                      className={`roster-checkbox flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        isChecked
                          ? "border-[var(--deca-blue)] bg-[var(--deca-blue)]"
                          : "border-[var(--gray-300)]"
                      }`}
                    >
                      {isChecked && (
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <Avatar
                      src={member.avatar_url}
                      name={member.full_name}
                      size="sm"
                      className={isChecked ? "ring-2 ring-[var(--success)] ring-offset-1" : ""}
                    />
                    <span className="flex-1 font-medium text-sm text-[var(--gray-900)]">
                      {member.full_name ?? "—"}
                    </span>
                    <span className="text-xs text-[var(--gray-500)]">
                      Grade {member.grade ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary — 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-4">
              Attendance
            </h3>
            <p className="text-[28px] font-bold text-[var(--gray-900)] leading-none">
              {presentCount} / {totalCount}
            </p>
            <p className="mt-1 text-sm text-[var(--gray-500)]">present</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--gray-200)]">
              <div
                className="h-full rounded-full bg-[var(--deca-blue)] transition-all"
                style={{ width: `${rate}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--gray-500)]">
              {rate.toFixed(0)}%
            </p>
            <p className="mt-3 text-xs text-[var(--gray-500)]">
              +10 pts each to present members
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-4">
              Quick Actions
            </h3>
            {!attendanceLocked && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="flex-1 rounded-[var(--radius-sm)] border border-[var(--gray-200)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="flex-1 rounded-[var(--radius-sm)] border border-[var(--gray-200)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          {!attendanceLocked && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="w-full rounded-[var(--radius-sm)] bg-[var(--deca-blue)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--deca-blue-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving
                ? "Saving..."
                : `Save Attendance (${presentCount} members)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
