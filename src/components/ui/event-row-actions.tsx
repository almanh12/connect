"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";

export interface EventRowActionsEvent {
  id: string;
  title: string;
  location?: string | null;
  attended_count?: number;
  total_members?: number;
  has_attendance_marked?: boolean;
}

interface EventRowActionsProps<E extends EventRowActionsEvent = EventRowActionsEvent> {
  event: E;
  isAdmin: boolean;
  isPast: boolean;
  onRowClick: (event: E, isPast: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Right-side meta/action area for event row: location, attendance, View button, overflow menu.
 * Reusable across event list UIs.
 */
export function EventRowActions<E extends EventRowActionsEvent>({
  event,
  isAdmin,
  isPast,
  onRowClick,
  onEdit,
  onDelete,
}: EventRowActionsProps<E>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const attendedCount = event.attended_count ?? 0;
  const totalMembers = event.total_members ?? 0;
  const hasAttendance = event.has_attendance_marked ?? attendedCount > 0;
  const hasActions = isAdmin && (onEdit || onDelete);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="flex shrink-0 items-center gap-3 pl-4">
      {event.location && (
        <span
          className="flex items-center gap-1.5 text-[13px] text-[var(--gray-500)] whitespace-nowrap"
          title={event.location}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-[120px] truncate">{event.location}</span>
        </span>
      )}
      {isAdmin && isPast && hasAttendance && (
        <span className="text-xs font-medium text-[var(--success)] whitespace-nowrap">
          ✓ {attendedCount}/{totalMembers} attended
        </span>
      )}
      {isAdmin && isPast && !hasAttendance && (
        <Link
          href={`/admin/attendance/${event.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center rounded-md border border-[#D97706] bg-transparent px-3 py-1.5 text-xs font-medium text-[#D97706] transition hover:bg-[#FFFBEB]"
          aria-label={`Mark attendance for ${event.title}`}
        >
          ⚠ Mark Attendance
        </Link>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRowClick(event, isPast);
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--gray-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1"
        aria-label={`View ${event.title}`}
      >
        View
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      {hasActions && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--gray-500)] transition hover:bg-[var(--gray-100)] hover:text-[var(--gray-700)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 disabled:opacity-50"
            aria-label="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-[var(--gray-200)] bg-white py-1 shadow-lg"
              >
                {onEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEF2F2]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
