"use client";

import { format } from "date-fns";
import { Calendar, MapPin, Pencil, Trash2 } from "lucide-react";

import { RsvpToggle } from "@/components/rsvp-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseEventDateTime } from "@/lib/utils";

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
  hasRsvp?: boolean;
  isPast?: boolean;
}

export function EventModal({
  event,
  onClose,
  isAdmin = false,
  onEdit,
  onDelete,
  hasRsvp = false,
  isPast = false,
}: EventModalProps) {
  const isMandatory = event.is_mandatory ?? false;
  const eventType = event.event_type ?? "event";

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
            <Badge variant={isMandatory ? "default" : "secondary"}>
              {isMandatory ? "Mandatory" : "Optional"}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {eventType}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
              {format(parseEventDateTime(event.start_time, event.date), "EEE, MMM d")} ·{" "}
              {format(parseEventDateTime(event.start_time, event.date), "h:mm a")} –{" "}
              {format(parseEventDateTime(event.end_time, event.date), "h:mm a")}
            </span>
          </div>
          {event.location && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {event.location}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
          {!isAdmin && (
            <div className="mt-4">
              <RsvpToggle
                key={`${event.id}-${hasRsvp}`}
                eventId={event.id}
                initialRsvped={hasRsvp}
                isPast={isPast}
                size="default"
              />
            </div>
          )}
        </div>

        {isAdmin && (onEdit || onDelete) && (
          <DialogFooter className="border-t border-border px-4 py-4 sm:px-6">
            {onEdit && (
              <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 flex-1"
                onClick={() => void onDelete()}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
