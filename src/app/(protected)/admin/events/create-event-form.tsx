"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { createEvent, updateEvent, updateEventSeries, type CreateEventInput } from "./actions";
import { toast } from "sonner";
import type { Event } from "@/lib/types";

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "competition", label: "Competition Prep" },
  { value: "social", label: "Social" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "workshop", label: "Workshop" },
  { value: "other", label: "Other" },
];

const RECURRENCE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const UNTIL_OPTIONS = [
  { value: "month", label: "End of month" },
  { value: "semester", label: "End of semester" },
  { value: "custom", label: "Custom date" },
];

/** 30-minute increment time options: 12:00 AM … 11:30 PM */
const TIME_OPTIONS: { label: string; value: string }[] = (() => {
  const opts: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const display = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
      const value24 = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      opts.push({ label: display, value: value24 });
    }
  }
  return opts;
})();

const DEFAULT_START_TIME = "15:00"; // 3:00 PM
const DEFAULT_END_TIME = "16:30";   // 4:30 PM

const defaultForm: CreateEventInput = {
  title: "",
  description: "",
  event_type: "",
  date: "",
  start_time: DEFAULT_START_TIME,
  end_time: DEFAULT_END_TIME,
  location: "",
  virtual_link: "",
  is_mandatory: false,
  max_capacity: undefined,
  recurring: false,
  recurrence_type: "weekly",
  recurrence_until: "month",
  recurrence_end: undefined,
};

function eventToFormInput(e: Event): CreateEventInput {
  const dateStr = e.date ? e.date.slice(0, 10) : "";
  const startTime = e.start_time?.includes("T")
    ? e.start_time.slice(11, 16)
    : (e.start_time ?? "").slice(0, 5);
  const endTime = e.end_time?.includes("T")
    ? e.end_time.slice(11, 16)
    : (e.end_time ?? "").slice(0, 5);
  return {
    title: e.title ?? "",
    description: e.description ?? "",
    event_type: e.event_type ?? "meeting",
    date: dateStr,
    start_time: startTime,
    end_time: endTime,
    location: e.location ?? "",
    virtual_link: e.virtual_link ?? "",
    is_mandatory: e.is_mandatory ?? false,
    max_capacity: e.max_capacity ?? undefined,
    recurring: !!e.recurrence_type,
    recurrence_type: e.recurrence_type ?? "weekly",
    recurrence_until: "month",
    recurrence_end: undefined,
  };
}

interface CreateEventFormProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-fill date when opened from calendar click (YYYY-MM-DD) */
  defaultDate?: string;
  /** When provided, form is in edit mode */
  initialEvent?: Event | null;
  /** When true and editing a recurring event, update all events in the series */
  editSeries?: boolean;
}

export function CreateEventForm({
  onClose,
  onSuccess,
  defaultDate,
  initialEvent,
  editSeries = false,
}: CreateEventFormProps) {
  const isEditMode = !!initialEvent;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<CreateEventInput>(() =>
    initialEvent
      ? eventToFormInput(initialEvent)
      : { ...defaultForm, date: defaultDate ?? today }
  );

  useEffect(() => {
    if (initialEvent) {
      setForm(eventToFormInput(initialEvent));
    } else if (defaultDate) {
      setForm((f) => ({ ...f, date: defaultDate }));
    }
  }, [initialEvent, defaultDate]);

  const showError = useCallback(
    (field: string): boolean => {
      if (!(touched[field] || submitted)) return false;
      if (field === "title") return !form.title?.trim();
      if (field === "event_type") return !form.event_type;
      if (field === "date") return !form.date;
      if (field === "start_time") return !form.start_time;
      if (field === "end_time") return !form.end_time;
      if (field === "end_time_late") {
        if (!form.date || !form.start_time || !form.end_time) return false;
        const start = new Date(`${form.date}T${form.start_time}`);
        const end = new Date(`${form.date}T${form.end_time}`);
        return end <= start;
      }
      return false;
    },
    [touched, submitted, form]
  );

  const handleBlur = (field: string) => {
    setTouched((p) => ({ ...p, [field]: true }));
  };

  const isValid =
    !!form.title?.trim() &&
    !!form.event_type &&
    !!form.date &&
    !!form.start_time &&
    !!form.end_time &&
    (() => {
      const start = new Date(`${form.date}T${form.start_time}`);
      const end = new Date(`${form.date}T${form.end_time}`);
      return end > start;
    })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) return;

    setIsSubmitting(true);

    if (isEditMode && initialEvent) {
      const startTs = new Date(`${form.date}T${form.start_time}:00`).toISOString();
      const endTs = new Date(`${form.date}T${form.end_time}:00`).toISOString();
      const payload = {
        ...form,
        event_type: form.event_type || "meeting",
        virtual_link: form.virtual_link || undefined,
        max_capacity: form.max_capacity ?? undefined,
        recurring: form.recurring,
        recurrence_type: form.recurring ? form.recurrence_type : undefined,
        start_timestamp: startTs,
        end_timestamp: endTs,
      };
      const result =
        editSeries && initialEvent.recurring_group_id
          ? await updateEventSeries(initialEvent.recurring_group_id, payload)
          : await updateEvent(initialEvent.id, payload);
      setIsSubmitting(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editSeries ? "All events in series updated" : "Event updated");
    } else {
      const startTs = new Date(`${form.date}T${form.start_time}:00`).toISOString();
      const endTs = new Date(`${form.date}T${form.end_time}:00`).toISOString();
      const result = await createEvent({
        ...form,
        event_type: form.event_type || "meeting",
        virtual_link: form.virtual_link || undefined,
        max_capacity: form.max_capacity ?? undefined,
        recurrence_type: form.recurring ? form.recurrence_type : undefined,
        recurrence_until: form.recurring ? form.recurrence_until : undefined,
        recurrence_end: form.recurring ? form.recurrence_end : undefined,
        start_timestamp: startTs,
        end_timestamp: endTs,
      });
      setIsSubmitting(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Event created successfully", { duration: 3000 });
    }
    onSuccess();
    onClose();
  };

  const panelContent = (
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
        className="modal"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 480,
          maxWidth: "90vw",
          height: "100vh",
          background: "var(--white)",
          boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.12)",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          animation: "panelSlideIn 300ms ease forwards",
        }}
      >
        {/* Header */}
        <div className="panel-header flex justify-between items-center px-7 py-6 border-b border-[var(--gray-200)] shrink-0">
          <h2 className="panel-title text-xl font-bold text-[var(--gray-900)]">
            {isEditMode ? "Edit Event" : "Create Event"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="panel-close w-8 h-8 rounded-[var(--radius-sm)] border-none bg-transparent text-[var(--gray-500)] cursor-pointer flex items-center justify-center transition hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="panel-body flex-1 overflow-y-auto px-7 py-7 flex flex-col gap-5">
            {/* Title */}
            <div>
              <label className="field-label block text-[13px] font-medium text-[var(--gray-700)] mb-1.5">
                Title <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onBlur={() => handleBlur("title")}
                className={`field-input w-full h-10 px-3 rounded-lg border text-[14px] font-normal text-[var(--gray-900)] bg-white placeholder:text-[var(--gray-300)] focus:outline-none focus:border-[var(--deca-blue)] focus:ring-[3px] focus:ring-[var(--deca-blue)]/10 transition ${
                  showError("title") ? "border-[var(--error)] ring-[var(--error)]/10" : "border-[var(--gray-200)]"
                }`}
                placeholder="e.g., Weekly Chapter Meeting"
              />
              {showError("title") && (
                <p className="field-error text-xs text-[var(--error)] mt-1">
                  Title is required
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="field-label block text-[13px] font-medium text-[var(--gray-700)] mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="field-input field-textarea w-full min-h-[80px] py-2.5 px-3 resize-y rounded-lg border border-[var(--gray-200)] text-[14px] font-normal text-[var(--gray-900)] bg-white placeholder:text-[var(--gray-300)] focus:outline-none focus:border-[var(--deca-blue)] focus:ring-[3px] focus:ring-[var(--deca-blue)]/10 transition"
                placeholder="Add details about the event..."
              />
            </div>

            {/* Type */}
            <div>
              <label className="field-label block text-[13px] font-medium text-[var(--gray-700)] mb-1.5">
                Type <span className="text-[var(--error)]">*</span>
              </label>
              <div className="type-selector flex gap-2 flex-wrap">
                {EVENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, event_type: t.value }))}
                    className={`type-option px-4 py-2 text-[13px] font-medium rounded-lg border cursor-pointer transition ${
                      form.event_type === t.value
                        ? "bg-[var(--deca-blue-light)] border-[var(--deca-blue)] text-[var(--deca-blue)]"
                        : "bg-white border-[var(--gray-200)] text-[var(--gray-500)] hover:border-[var(--deca-blue-muted)] hover:text-[var(--gray-700)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {showError("event_type") && (
                <p className="field-error text-xs text-[var(--error)] mt-1">
                  Type is required
                </p>
              )}
            </div>

            {/* Date & Start Time */}
            <div className="field-row grid grid-cols-2 gap-4">
              <div>
                <label className="field-label block text-[13px] font-medium text-[var(--gray-700)] mb-1.5">
                  Date <span className="text-[var(--error)]">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  onBlur={() => handleBlur("date")}
                  className={`field-input w-full h-10 px-3 rounded-lg border text-[14px] font-normal text-[var(--gray-900)] bg-white focus:outline-none focus:border-[var(--deca-blue)] focus:ring-[3px] focus:ring-[var(--deca-blue)]/10 transition ${
                    showError("date") ? "border-[var(--error)]" : "border-[var(--gray-200)]"
                  }`}
                />
                {showError("date") && (
                  <p className="field-error text-xs text-[var(--error)] mt-1">
                    Date is required
                  </p>
                )}
              </div>
              <div>
                <label className="field-label block text-[13px] font-medium text-[var(--gray-700)] mb-1.5">
                  Start Time <span className="text-[var(--error)]">*</span>
                </label>
                <select
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  onBlur={() => handleBlur("start_time")}
                  className={`field-input w-full h-10 px-3 rounded-lg border text-[14px] font-normal text-[var(--gray-900)] bg-white focus:outline-none focus:border-[var(--deca-blue)] focus:ring-[3px] focus:ring-[var(--deca-blue)]/10 transition ${
                    showError("start_time") ? "border-[var(--error)]" : "border-[var(--gray-200)]"
                  }`}
                >
                  <option value="">Select time</option>
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {showError("start_time") && (
                  <p className="field-error text-xs text-[var(--error)] mt-1">
                    Start time is required
                  </p>
                )}
              </div>
            </div>

            {/* End Time & Location */}
            <div className="field-row grid grid-cols-2 gap-4">
              <div>
                <label className="field-label block text-[13px] font-medium text-[var(--gray-700)] mb-1.5">
                  End Time <span className="text-[var(--error)]">*</span>
                </label>
                <select
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  onBlur={() => handleBlur("end_time")}
                  className={`field-input w-full h-10 px-3 rounded-lg border text-[14px] font-normal text-[var(--gray-900)] bg-white focus:outline-none focus:border-[var(--deca-blue)] focus:ring-[3px] focus:ring-[var(--deca-blue)]/10 transition ${
                    showError("end_time") || showError("end_time_late")
                      ? "border-[var(--error)]"
                      : "border-[var(--gray-200)]"
                  }`}
                >
                  <option value="">Select time</option>
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {showError("end_time") && (
                  <p className="field-error text-xs text-[var(--error)] mt-1">
                    End time is required
                  </p>
                )}
                {showError("end_time_late") && !showError("end_time") && (
                  <p className="field-error text-xs text-[var(--error)] mt-1">
                    End time must be after start time
                  </p>
                )}
              </div>
              <div>
                <label className="field-label block text-[13px] font-medium text-[var(--gray-700)] mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="field-input w-full h-10 px-3 rounded-lg border border-[var(--gray-200)] text-[14px] font-normal text-[var(--gray-900)] bg-white placeholder:text-[var(--gray-300)] focus:outline-none focus:border-[var(--deca-blue)] focus:ring-[3px] focus:ring-[var(--deca-blue)]/10 transition"
                  placeholder="e.g., Room 204"
                />
              </div>
            </div>

            {/* Mandatory */}
            <div className="toggle-row flex items-start justify-between gap-4 p-4 bg-[var(--gray-50)] border border-[var(--gray-100)] rounded-[var(--radius-md)]">
              <div>
                <p className="toggle-label font-medium text-[14px] text-[var(--gray-700)]">
                  Mandatory
                </p>
                <p className="toggle-desc text-[12px] text-[var(--gray-500)] mt-0.5">
                  Members are required to attend
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_mandatory}
                onClick={() => setForm((f) => ({ ...f, is_mandatory: !f.is_mandatory }))}
                className={`toggle-switch w-11 h-6 rounded-full relative cursor-pointer transition flex-shrink-0 ${
                  form.is_mandatory ? "bg-[var(--deca-blue)]" : "bg-[var(--gray-200)]"
                }`}
              >
                <span
                  className={`absolute w-5 h-5 bg-white rounded-full top-0.5 left-0.5 shadow-sm transition-transform ${
                    form.is_mandatory ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Recurring */}
            <div className="toggle-row flex flex-col gap-3 p-4 bg-[var(--gray-50)] border border-[var(--gray-100)] rounded-[var(--radius-md)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="toggle-label font-medium text-[14px] text-[var(--gray-700)]">
                    Recurring Event
                  </p>
                  <p className="toggle-desc text-[12px] text-[var(--gray-500)] mt-0.5">
                    Repeat this event on a schedule
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.recurring}
                  onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
                  className={`toggle-switch w-11 h-6 rounded-full relative cursor-pointer transition flex-shrink-0 ${
                    form.recurring ? "bg-[var(--deca-blue)]" : "bg-[var(--gray-200)]"
                  }`}
                >
                  <span
                    className={`absolute w-5 h-5 bg-white rounded-full top-0.5 left-0.5 shadow-sm transition-transform ${
                      form.recurring ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {form.recurring && (
                <div className="recurring-options mt-3 pt-3 border-t border-[var(--gray-200)] grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--gray-500)] mb-1">
                      Repeat
                    </label>
                    <select
                      value={form.recurrence_type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, recurrence_type: e.target.value }))
                      }
                      className="field-input w-full h-10 px-3 rounded-lg border border-[var(--gray-200)] text-[14px] font-normal text-[var(--gray-900)] bg-white focus:outline-none focus:border-[var(--deca-blue)]"
                    >
                      {RECURRENCE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--gray-500)] mb-1">
                      Until
                    </label>
                    <select
                      value={form.recurrence_until ?? "month"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recurrence_until: e.target.value as "month" | "semester" | "custom",
                        }))
                      }
                      className="field-input w-full h-10 px-3 rounded-lg border border-[var(--gray-200)] text-[14px] font-normal text-[var(--gray-900)] bg-white focus:outline-none focus:border-[var(--deca-blue)]"
                    >
                      {UNTIL_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                    {(form.recurrence_until ?? "month") === "custom" && (
                      <input
                        type="date"
                        value={form.recurrence_end ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, recurrence_end: e.target.value || undefined }))
                        }
                        className="field-input mt-2 w-full h-10 px-3 rounded-lg border border-[var(--gray-200)] text-[14px]"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="panel-footer py-5 px-7 border-t border-[var(--gray-200)] shrink-0">
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="create-event-btn w-full h-11 bg-[var(--deca-blue)] text-white font-semibold text-[15px] rounded-lg border-none cursor-pointer transition hover:bg-[var(--deca-blue-dark)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (isEditMode ? "Saving…" : "Creating…") : isEditMode ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;

  return createPortal(panelContent, document.body);
}
