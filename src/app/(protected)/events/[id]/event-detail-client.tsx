"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { format } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Video,
  Users,
  Pencil,
  Trash2,
  Share2,
  ExternalLink,
  QrCode,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { deleteEvent } from "@/app/(protected)/admin/events/actions";
import { getEventTypeIcon } from "@/lib/event-type-icons";
import { RsvpToggle } from "@/components/rsvp-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AttendanceView } from "@/app/(protected)/admin/events/attendance-view";
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

interface EventDetailClientProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    date?: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
    virtual_link: string | null;
    event_type: string | null;
    is_mandatory: boolean | null;
  };
  userId: string;
  attendedCount: number;
  attendees: { id: string; full_name: string | null; avatar_url: string | null; attended: boolean }[];
  isOfficer: boolean;
  hasRsvp: boolean;
  isPast: boolean;
}

export function EventDetailClient({
  event,
  userId,
  attendedCount,
  attendees,
  isOfficer,
  hasRsvp,
  isPast,
}: EventDetailClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<
    { id: string; user_id: string; attended: boolean; checked_in_at: string | null; profile: { full_name: string | null; email: string | null } | null }[]
  >([]);

  const eventType = event.event_type ?? "meeting";
  const typeLabel = EVENT_TYPE_LABELS[eventType] ?? eventType;
  const TypeIcon = getEventTypeIcon(eventType);
  const isMandatory = event.is_mandatory ?? false;

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/events/${event.id}` : "";
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const fetchAttendance = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("attendance")
      .select("id, user_id, attended, checked_in_at")
      .eq("event_id", event.id);
    if (!data?.length) {
      setAttendanceData([]);
      return;
    }
    const userIds = [...new Set(data.map((a) => a.user_id))];
    const { data: profData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profMap = Object.fromEntries(
      (profData ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
    );
    setAttendanceData(
      data.map((a) => ({
        ...a,
        profile: profMap[a.user_id] ?? null,
      }))
    );
  };

  const openAttendance = () => {
    setShowAttendance(true);
    fetchAttendance();
  };

  const mapUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[var(--deca-blue-light)] to-card shadow-sm">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--deca-blue-light)] text-primary">
              <TypeIcon className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{typeLabel}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={isMandatory ? "destructive" : "secondary"}>
                  {isMandatory ? "Mandatory" : "Optional"}
                </Badge>
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {format(parseEventDateTime(event.start_time, event.date), "EEE, MMM d, yyyy")} ·{" "}
                  {format(parseEventDateTime(event.start_time, event.date), "h:mm a")} –{" "}
                  {format(parseEventDateTime(event.end_time, event.date), "h:mm a")}
                </span>
              </div>
            </div>
          </div>
          {isOfficer && (
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <button
                type="button"
                onClick={openAttendance}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <QrCode className="h-4 w-4" />
                Attendance
              </button>
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-gray-600">{event.description}</p>
        </section>
      )}

      {/* Location / Virtual */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Location</h2>
        {event.location ? (
          <a
            href={mapUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex min-h-11 items-center gap-2 text-primary hover:underline"
          >
            <MapPin className="h-5 w-5 shrink-0" />
            {event.location}
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="mt-2 text-gray-500">No physical location</p>
        )}
        {event.virtual_link && (
          <a
            href={event.virtual_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-[var(--deca-blue-dark)]"
          >
            <Video className="h-5 w-5" />
            Join virtually
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </section>

      {/* Attendance (officers) or Share */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {attendedCount > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {attendedCount} {attendedCount === 1 ? "member" : "members"} attended
                </p>
                {attendees.length > 0 && (
                  <div className="mt-3 flex -space-x-2">
                    {attendees.filter((a) => a.attended).slice(0, 6).map((a) => (
                      <div
                        key={a.id}
                        className="relative rounded-full border-2 border-white bg-gray-200"
                        title={a.full_name ?? "Attendee"}
                      >
                        <Avatar
                          src={a.avatar_url}
                          name={a.full_name}
                          size="sm"
                        />
                        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-green-500">
                          <Check className="h-2 w-2 text-white" />
                        </span>
                      </div>
                    ))}
                    {attendees.filter((a) => a.attended).length > 6 && (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-600">
                        +{attendees.filter((a) => a.attended).length - 6}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!isOfficer && (
              <RsvpToggle
                key={`${event.id}-${hasRsvp}`}
                eventId={event.id}
                initialRsvped={hasRsvp}
                isPast={isPast}
              />
            )}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </section>

      {showDelete && (
        <ConfirmDialog
          open={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={async () => {
            const result = await deleteEvent(event.id);
            if (result.error) throw new Error(result.error);
            toast.success("Event deleted");
            window.location.href = "/events";
          }}
          title="Delete Event"
          description={`Are you sure you want to delete "${event.title}"? This will also remove all attendance records.`}
          confirmLabel="Delete"
          variant="danger"
        />
      )}

      {showAttendance && (
        <AttendanceView
          event={{
            id: event.id,
            title: event.title,
            event_type: event.event_type,
            start_time: event.start_time,
            is_mandatory: event.is_mandatory,
          }}
          attendance={attendanceData}
          onClose={() => {
            setShowAttendance(false);
            setAttendanceData([]);
          }}
          onUpdate={fetchAttendance}
        />
      )}
    </div>
  );
}
