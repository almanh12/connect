"use client";

import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
 */
export function EventRowActions<E extends EventRowActionsEvent>({
  event,
  isAdmin,
  isPast,
  onRowClick,
  onEdit,
  onDelete,
}: EventRowActionsProps<E>) {
  const attendedCount = event.attended_count ?? 0;
  const totalMembers = event.total_members ?? 0;
  const hasAttendance = event.has_attendance_marked ?? attendedCount > 0;
  const hasActions = isAdmin && (onEdit || onDelete);

  return (
    <div className="flex shrink-0 items-center gap-3 pl-4">
      {event.location && (
        <span
          className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted-foreground"
          title={event.location}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-[120px] truncate">{event.location}</span>
        </span>
      )}
      {isAdmin && isPast && hasAttendance && (
        <span className="whitespace-nowrap text-xs font-medium text-success">
          ✓ {attendedCount}/{totalMembers} attended
        </span>
      )}
      {isAdmin && isPast && !hasAttendance && (
        <Link
          href={`/admin/attendance/${event.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-warning bg-transparent px-3 py-1.5 text-xs font-medium text-warning transition hover:bg-[var(--warning-light)]"
          aria-label={`Mark attendance for ${event.title}`}
        >
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Mark Attendance
        </Link>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRowClick(event, isPast);
        }}
        className="gap-1"
        aria-label={`View ${event.title}`}
      >
        View
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
      {hasActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(e) => e.stopPropagation()}
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
