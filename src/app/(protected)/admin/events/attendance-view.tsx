"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { X, Check, Download, QrCode } from "lucide-react";
import { format } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import { manualCheckIn } from "./actions";
import { toast } from "sonner";
import { useOptimisticAction } from "@/hooks/use-optimistic-action";
import { QRModal } from "./qr-modal";

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

interface AttendanceRecord {
  id: string;
  user_id: string;
  attended: boolean;
  checked_in_at: string | null;
  profile: { full_name: string | null; email: string | null } | null;
}

interface AttendanceViewProps {
  event: {
    id: string;
    title: string;
    event_type: string | null;
    date?: string | null;
    start_time: string;
    is_mandatory: boolean | null;
  };
  attendance: AttendanceRecord[];
  onClose: () => void;
  onUpdate: () => void;
}

export function AttendanceView({
  event,
  attendance,
  onClose,
  onUpdate,
}: AttendanceViewProps) {
  const [rows, setRows] = useState(attendance);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    setRows(attendance);
  }, [attendance]);

  const checkInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkin/${event.id}`
      : "";

  const { execute: runCheckIn } = useOptimisticAction({
    action: (attendanceId: string) => manualCheckIn(attendanceId, event.id),
    onOptimistic: (attendanceId) => {
      let snapshot: AttendanceRecord[] | null = null;
      setRows((prev) => {
        snapshot = prev;
        return prev.map((row) =>
          row.id === attendanceId
            ? {
                ...row,
                attended: true,
                checked_in_at: new Date().toISOString(),
              }
            : row
        );
      });
      return () => {
        if (snapshot) setRows(snapshot);
      };
    },
    successToast: "Member checked in",
    onSuccess: () => onUpdate(),
  });

  const handleCheckIn = useCallback(
    (attendanceId: string) => {
      void runCheckIn(attendanceId);
    },
    [runCheckIn]
  );

  const exportCsv = useCallback(() => {
    const headers = ["Name", "Email", "Status", "Checked In At"];
    const csvRows = rows.map((a) => [
      a.profile?.full_name ?? "—",
      a.profile?.email ?? "—",
      a.attended ? "Attended" : "RSVP'd",
      a.checked_in_at
        ? format(new Date(a.checked_in_at), "yyyy-MM-dd HH:mm")
        : "—",
    ]);
    const csv = [headers.join(","), ...csvRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${event.title.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [rows, event.title]);

  const content = (
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
          className="modal-content h-full w-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-gray-200 bg-white shadow-xl flex flex-col animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {EVENT_TYPE_LABELS[event.event_type ?? ""] ?? event.event_type} ·{" "}
              {format(parseEventDateTime(event.start_time, event.date), "EEE, MMM d, yyyy")}
            </p>
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

        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 180px)" }}>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                QR Code for Check-in
              </p>
              <QRCodeSVG value={checkInUrl} size={128} level="M" />
              <p className="mt-2 text-xs text-gray-500 break-all">
                {checkInUrl}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#004B87]"
              >
                <QrCode className="h-4 w-4" />
                Generate QR
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {showQRModal && (
            <QRModal
              eventId={event.id}
              eventTitle={event.title}
              checkInUrl={checkInUrl}
              initialAttendedCount={rows.filter((a) => a.attended).length}
              onClose={() => setShowQRModal(false)}
            />
          )}

          <h3 className="mb-3 font-medium text-gray-900">Attendance List</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">No RSVPs yet</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {rows.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {a.profile?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {a.profile?.email ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.attended ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        <Check className="h-4 w-4" />
                        Checked in
                        {a.checked_in_at && (
                          <span className="text-green-600">
                            {" "}
                            {format(new Date(a.checked_in_at), "h:mm a")}
                          </span>
                        )}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckIn(a.id)}
                        className="rounded-lg bg-[#0072CE] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#004B87]"
                      >
                        Check In
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
