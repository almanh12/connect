"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { deleteEvent } from "./actions";
import { toast } from "sonner";

interface DeleteEventDialogProps {
  event: { id: string; title: string };
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteEventDialog({
  event,
  onClose,
  onSuccess,
}: DeleteEventDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteEvent(event.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Event deleted");
    onSuccess();
    onClose();
  };

  const dialogContent = (
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
        aria-hidden
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
          className="modal-content w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:max-h-[90vh] overflow-y-auto animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
        <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
        <p className="mt-2 text-gray-600">
          Are you sure you want to delete &quot;{event.title}&quot;? This will
          also remove all attendance records.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 min-h-[44px] rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialogContent, document.body);
}
