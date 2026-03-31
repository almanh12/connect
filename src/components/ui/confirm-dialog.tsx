"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  /** When set, user must type this to confirm (e.g. "DELETE") */
  confirmText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmText,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canConfirm = confirmText
    ? inputValue === confirmText
    : true;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return;
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("[ConfirmDialog]", err);
    } finally {
      setIsLoading(false);
    }
  }, [canConfirm, onConfirm, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && canConfirm && !confirmText) handleConfirm();
    },
    [onClose, canConfirm, confirmText, handleConfirm]
  );

  useEffect(() => {
    if (!open) setInputValue("");
  }, [open]);

  if (!open) return null;

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
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
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
        onKeyDown={handleKeyDown}
      >
        <div
          className="modal animate-modal-enter w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
          style={{ pointerEvents: "auto" }}
        >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="confirm-title" className="pr-8 text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id="confirm-desc" className="mt-2 text-sm text-gray-600">
          {description}
        </p>
        {confirmText && (
          <div className="mt-4">
            <label htmlFor="confirm-input" className="block text-sm font-medium text-gray-700">
              Type <span className="font-mono font-bold">{confirmText}</span> to confirm
            </label>
            <input
              id="confirm-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              autoComplete="off"
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#0072CE] hover:bg-[#004B87]"
            }`}
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </div>
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialogContent, document.body);
}
