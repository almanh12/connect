"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEvent, type CreateEventInput } from "./actions";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "mcq_practice", label: "MCQ Practice" },
  { value: "roleplay_practice", label: "Roleplay Practice" },
  { value: "workshop", label: "Workshop" },
  { value: "social", label: "Social" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "community_service", label: "Community Service" },
  { value: "competition", label: "Competition" },
];

const RECURRENCE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
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

interface EditEventFormProps {
  eventId: string;
  initialData: CreateEventInput;
}

export function EditEventForm({ eventId, initialData }: EditEventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CreateEventInput>(initialData);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title?.trim()) e.title = "Title is required";
    if (!form.date) e.date = "Date is required";
    if (!form.start_time) e.start_time = "Start time is required";
    if (!form.end_time) e.end_time = "End time is required";
    if (form.date && form.start_time && form.end_time) {
      const start = new Date(`${form.date}T${form.start_time}`);
      const end = new Date(`${form.date}T${form.end_time}`);
      if (end <= start) e.end_time = "End time must be after start time";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    const startTs = new Date(`${form.date}T${form.start_time}:00`).toISOString();
    const endTs = new Date(`${form.date}T${form.end_time}:00`).toISOString();
    const result = await updateEvent(eventId, {
      ...form,
      virtual_link: form.virtual_link || undefined,
      max_capacity: form.max_capacity ?? undefined,
      recurrence_type: form.recurring ? form.recurrence_type : undefined,
      start_timestamp: startTs,
      end_timestamp: endTs,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Event updated");
    router.push("/admin/events");
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Event Type *
          </label>
          <select
            value={form.event_type}
            onChange={(e) =>
              setForm((f) => ({ ...f, event_type: e.target.value }))
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Time *
            </label>
            <select
              value={form.start_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_time: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
            >
              <option value="">Select time</option>
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Time *
            </label>
            <select
              value={form.end_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, end_time: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
            >
              <option value="">Select time</option>
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.end_time && (
              <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Virtual Link
          </label>
          <input
            type="url"
            value={form.virtual_link}
            onChange={(e) =>
              setForm((f) => ({ ...f, virtual_link: e.target.value }))
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div>
            <p className="font-medium text-gray-900">Mandatory</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_mandatory}
            onClick={() =>
              setForm((f) => ({ ...f, is_mandatory: !f.is_mandatory }))
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              form.is_mandatory ? "bg-red-500" : "bg-blue-500"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                form.is_mandatory ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Capacity
          </label>
          <input
            type="number"
            min={1}
            value={form.max_capacity ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                max_capacity: e.target.value
                  ? parseInt(e.target.value, 10)
                  : undefined,
              }))
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/events")}
          className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[#0072CE] px-4 py-2.5 font-semibold text-white hover:bg-[#004B87] disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
