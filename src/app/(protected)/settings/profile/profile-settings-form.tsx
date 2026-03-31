"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search, Check } from "lucide-react";
import {
  getEventsGroupedByCategory,
  searchEvents,
  getCategoryTemplate,
  ONTARIO_DECA_EVENTS,
  CATEGORY_DISPLAY_NAMES,
} from "@/lib/ontario-deca-data";
import { EXPERIENCE_LEVELS, GRADES } from "@/app/(protected)/onboarding/onboarding-data";
import { Avatar } from "@/components/avatar";
import { updateProfile, deleteAccount } from "./actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getTier, formatTierForDisplay } from "@/lib/points";

function TierBadge({ score }: { score: number }) {
  const tierInfo = getTier(score);
  const letter = tierInfo.name === "platinum" ? "P" : tierInfo.name.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: `${tierInfo.color}20`,
        color: tierInfo.color,
        border: `1px solid ${tierInfo.color}40`,
      }}
    >
      {letter}
    </span>
  );
}

const CATEGORY_ORDER = [
  "Principles of Business Administration",
  "Individual Series",
  "Team Decision Making",
  "Personal Financial Literacy",
  "Operations Research",
  "Project Management",
  "Entrepreneurship",
  "Integrated Marketing Campaigns",
  "Professional Selling and Consulting",
  "Online Events",
];

interface ProfileSettingsFormProps {
  initialData: {
    full_name: string;
    grade: number | null;
    experience_level: string | null;
    interests: string[];
    avatar_url: string | null;
    engagement_score?: number;
    tier?: string;
    role?: string;
  };
}

export function ProfileSettingsForm({ initialData }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialData.full_name);
  const [grade, setGrade] = useState<number | null>(initialData.grade);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(
    initialData.experience_level
  );
  const [selectedEventCodes, setSelectedEventCodes] = useState<string[]>(
    initialData.interests
  );
  const [eventSearch, setEventSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const groupedEvents = useMemo(() => getEventsGroupedByCategory(), []);
  const filteredEvents = useMemo(
    () => (eventSearch.trim() ? searchEvents(eventSearch) : ONTARIO_DECA_EVENTS),
    [eventSearch]
  );
  const filteredGrouped = useMemo(() => {
    if (eventSearch.trim()) {
      const byCat: Record<string, typeof filteredEvents> = {};
      for (const e of filteredEvents) {
        const label = CATEGORY_DISPLAY_NAMES[e.category_key] ?? e.category_key;
        if (!byCat[label]) byCat[label] = [];
        byCat[label].push(e);
      }
      return byCat;
    }
    return groupedEvents;
  }, [eventSearch, filteredEvents, groupedEvents]);

  const toggleEvent = (code: string) => {
    setSelectedEventCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 3) return prev;
      return [...prev, code];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateProfile({
        full_name: fullName.trim(),
        grade,
        experience_level: experienceLevel,
        interests:
          selectedEventCodes.length > 0 ? selectedEventCodes : null,
      });
      if (result.error) throw new Error(result.error);
      toast.success("Profile updated successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const result = await deleteAccount();
    if (result.error) {
      toast.error(result.error);
      throw result.error; // Prevent ConfirmDialog from closing
    }
    toast.success("Account deleted");
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-6">
          {/* Avatar & Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Profile photo
            </label>
            <div className="mt-2 flex items-center gap-4">
              <Avatar
                src={initialData.avatar_url}
                name={fullName}
                size={64}
                ringClassName="ring-2 ring-[#0171BB]/30"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-500">
                  Your photo is synced from your sign-in provider.
                </p>
                {initialData.engagement_score != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {initialData.engagement_score} PTS
                    </span>
                    <TierBadge score={initialData.engagement_score} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
            />
          </div>

          {/* Grade */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
              Grade
            </label>
            <select
              id="grade"
              value={grade ?? ""}
              onChange={(e) =>
                setGrade(e.target.value ? Number(e.target.value) : null)
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
            >
              <option value="">Select grade</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Experience level */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Experience level
            </label>
            <select
              value={experienceLevel ?? ""}
              onChange={(e) =>
                setExperienceLevel(e.target.value || null)
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
            >
              <option value="">Select experience level</option>
              {EXPERIENCE_LEVELS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Competition events */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Competition events
            </label>
            <p className="mt-0.5 text-sm text-gray-500">
              Choose 1–3 Ontario DECA events you plan to compete in.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search events (e.g. PBM, SEM)"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {selectedEventCodes.length}/3 selected
            </p>
            <div className="mt-3 max-h-[280px] space-y-4 overflow-y-auto pr-2">
              {CATEGORY_ORDER.map((catLabel) => {
                const events = filteredGrouped[catLabel];
                if (!events?.length) return null;
                return (
                  <div key={catLabel}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {catLabel}
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {events.map((event) => {
                        const template = getCategoryTemplate(event.category_key);
                        const participants = template?.participants ?? "1";
                        const selected = selectedEventCodes.includes(event.code);
                        return (
                          <button
                            key={event.code}
                            type="button"
                            onClick={() => toggleEvent(event.code)}
                            disabled={!selected && selectedEventCodes.length >= 3}
                            className={`flex items-start gap-2 rounded-lg border-2 p-2.5 text-left text-sm transition disabled:opacity-50 ${
                              selected
                                ? "border-[#0171BB] bg-[#0171BB]/10"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            {selected && (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0171BB]" />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-gray-900">
                                {event.name}
                              </span>
                              <span className="ml-1 text-xs text-gray-500">
                                ({event.code})
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#0171BB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004B87] disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        {initialData.role === "owner" ? (
          <>
            <p className="mt-1 text-sm text-red-700">
              As the chapter Owner, you must transfer ownership to another admin
              before deleting your account.
            </p>
            <button
              type="button"
              disabled
              className="mt-4 cursor-not-allowed rounded-lg border border-red-200 bg-gray-100 px-4 py-2 text-sm font-medium text-red-600/70"
            >
              Delete Account
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-red-700">
              Deleting your account will remove all your data. This cannot be
              undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete Account
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete account?"
        description="Are you sure? This cannot be undone. All your data will be permanently removed."
        confirmText="DELETE"
        confirmLabel="Delete Account"
        variant="danger"
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
