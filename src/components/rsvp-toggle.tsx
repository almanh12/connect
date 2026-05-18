"use client";

import { useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cancelRsvp, rsvpToEvent } from "@/app/(protected)/dashboard/actions";
import { toast } from "sonner";

import { useOptimisticAction } from "@/hooks/use-optimistic-action";
import { cn } from "@/lib/utils";

interface RsvpToggleProps {
  eventId: string;
  initialRsvped: boolean;
  /** Hide toggle for past events */
  isPast?: boolean;
  className?: string;
  size?: "sm" | "default";
}

/** Minimal RSVP control with optimistic UI. */
export function RsvpToggle({
  eventId,
  initialRsvped,
  isPast = false,
  className,
  size = "default",
}: RsvpToggleProps) {
  const [rsvped, setRsvped] = useState(initialRsvped);

  const { execute, isPending } = useOptimisticAction({
    action: async (join: boolean) => (join ? rsvpToEvent(eventId) : cancelRsvp(eventId)),
    onOptimistic: (join) => {
      const prev = rsvped;
      setRsvped(join);
      return () => setRsvped(prev);
    },
    successToast: false,
    onSuccess: (_, join) =>
      toast.success(join ? "You're going!" : "RSVP cancelled"),
  });

  if (isPast) return null;

  return (
    <Button
      type="button"
      variant={rsvped ? "secondary" : "default"}
      size={size}
      disabled={isPending}
      className={cn("gap-2", className)}
      onClick={() => void execute(!rsvped)}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <CalendarCheck className="h-4 w-4" aria-hidden />
      )}
      {rsvped ? "Going" : "RSVP"}
    </Button>
  );
}
