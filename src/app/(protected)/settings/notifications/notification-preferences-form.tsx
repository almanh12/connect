"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const STORAGE_KEY = "deca_notification_preferences";

export type NotificationKey =
  | "new_events"
  | "event_reminders"
  | "mandatory_alerts"
  | "points_earned"
  | "leaderboard_changes"
  | "new_announcements";

export interface NotificationPrefItem {
  key: NotificationKey;
  label: string;
  description: string;
}

function loadPreferences(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return parsed;
    }
  } catch {
    // ignore
  }
  // Default: all on
  return {};
}

function savePreferences(prefs: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

interface NotificationPreferencesFormProps {
  notificationKeys: readonly NotificationPrefItem[];
}

export function NotificationPreferencesForm({
  notificationKeys,
}: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setMounted(true);
  }, []);

  const getValue = (key: string) => {
    if (key in prefs) return prefs[key];
    return true; // default on
  };

  const setValue = (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePreferences(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    savePreferences(prefs);
    await new Promise((r) => setTimeout(r, 300)); // Simulate save
    setIsSaving(false);
    toast.success("Preferences saved");
  };

  if (!mounted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0171BB]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        {notificationKeys.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-4"
          >
            <div>
              <p className="font-medium text-gray-900">{label}</p>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={getValue(key)}
              onClick={() => setValue(key, !getValue(key))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                getValue(key) ? "bg-[#0171BB]" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  getValue(key) ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-[#0171BB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004B87] disabled:opacity-50"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Preferences"
          )}
        </button>
      </div>
    </div>
  );
}
