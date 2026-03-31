"use client";

import { createPortal } from "react-dom";
import { format } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import { X, MapPin, Calendar, Pencil, Trash2 } from "lucide-react";

interface EventModalProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    date?: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
    event_type: string | null;
    is_mandatory: boolean | null;
  };
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
}

export function EventModal({
  event,
  onClose,
  isAdmin = false,
  onEdit,
  onDelete,
}: EventModalProps) {
  const isMandatory = event.is_mandatory ?? false;
  const eventType = event.event_type ?? "event";

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
        aria-hidden="true"
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
          className="modal-content w-full h-[95vh] sm:h-auto sm:max-h-[90vh] max-w-lg rounded-t-2xl sm:rounded-2xl border border-blue-50 bg-white shadow-xl flex flex-col animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 p-4 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#1A1A2E]">{event.title}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isMandatory ? "bg-[#0072CE]/20 text-[#004B87]" : "bg-blue-50 text-[#0072CE]"}`}>
                {isMandatory ? "Mandatory" : "Optional"}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-[#6B7280] capitalize">
                {eventType}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280]">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 shrink-0" />
                {format(parseEventDateTime(event.start_time, event.date), "EEE, MMM d")} ·{" "}
                {format(parseEventDateTime(event.start_time, event.date), "h:mm a")} –{" "}
                {format(parseEventDateTime(event.end_time, event.date), "h:mm a")}
              </span>
            </div>
            {event.location && (
              <div className="mt-1 flex items-center gap-1 text-sm text-[#6B7280]">
                <MapPin className="h-4 w-4" />
                {event.location}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {event.description && (
            <p className="text-[#6B7280]">{event.description}</p>
          )}
          {isAdmin && (onEdit || onDelete) && (
            <div className="mt-6 flex gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E5EA] bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E5EA] bg-transparent px-4 py-2.5 text-sm font-medium text-[#DC2626] hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
