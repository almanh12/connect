"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EXPERIENCE_LEVELS, GRADES, STEP_LABELS } from "./onboarding-data";
import {
  ONTARIO_DECA_EVENTS,
  CATEGORY_DISPLAY_NAMES,
  getEventsGroupedByCategory,
  searchEvents,
  getCategoryTemplate,
} from "@/lib/ontario-deca-data";
import { completeOnboarding } from "./actions";
import { ChevronRight, Loader2, Sparkles, Search, Check, User, Target, CheckCircle2 } from "lucide-react";

const TOTAL_STEPS = 4;

interface OnboardingWizardProps {
  initialName: string | null;
  initialEmail: string | null;
}

export function OnboardingWizard({
  initialName,
  initialEmail,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialName ?? "");
  const [grade, setGrade] = useState<number | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [selectedEventCodes, setSelectedEventCodes] = useState<string[]>([]);
  const [eventSearch, setEventSearch] = useState("");

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

  const canProceed = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return fullName.trim().length > 0 && grade !== null && experienceLevel;
      case 3:
        return selectedEventCodes.length >= 1 && selectedEventCodes.length <= 3;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      setError(null);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      setError(null);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await completeOnboarding({
        full_name: fullName.trim(),
        grade,
        experience_level: experienceLevel,
        interests: selectedEventCodes.length > 0 ? selectedEventCodes : null,
      });

      if (result.error) throw new Error(result.error);

      setShowConfetti(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
      console.error("[onboarding] Client error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showConfetti, setShowConfetti] = useState(false);
  const progress = (step / TOTAL_STEPS) * 100;
  const selectedEventNames = selectedEventCodes
    .map((c) => ONTARIO_DECA_EVENTS.find((e) => e.code === c)?.name ?? c)
    .filter(Boolean);

  const categoryOrder = [
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

  const CONFETTI_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#0171BB", "#10B981", "#F59E0B", "#8B5CF6"];
  const confettiPieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: 10 + (i * 3.5) % 80,
    delay: (i * 0.02) % 0.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8">
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* Progress bar with step labels */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-medium text-gray-500">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className={step >= i + 1 ? "text-[#0171BB]" : ""}>
              {label}
            </span>
          ))}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#0171BB] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="-mt-2 mb-4 flex justify-center">
          <Link href="/dashboard" className="transition-opacity hover:opacity-90">
            <Image
              src="/deca-logo.png"
              alt="DECA"
              width={48}
              height={49}
              className="h-10 w-auto object-contain"
              sizes="48px"
            />
          </Link>
        </div>
        {error && (
          <div
            className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-slide-in">
            <div className="flex justify-center">
              <div className="rounded-2xl bg-[#0171BB]/10 p-6">
                <Sparkles className="h-16 w-16 text-[#0171BB]" />
              </div>
            </div>
            <h1 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Welcome to DECA Engage!
            </h1>
            <p className="mt-4 text-center text-gray-600">
              The AI-powered platform for Ontario DECA chapters. Track events,
              earn points, get personalized competition strategies, and practice
              for provincials and ICDC.
            </p>
            <p className="mt-2 text-center text-gray-600">
              Let&apos;s set up your profile so we can personalize your
              experience.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-slide-in">
            <div className="flex justify-center">
              <div className="rounded-2xl bg-[#0171BB]/10 p-6">
                <User className="h-16 w-16 text-[#0171BB]" />
              </div>
            </div>
            <h2 className="mt-6 text-xl font-bold text-gray-900">About You</h2>
            <p className="mt-1 text-gray-600">Tell us a bit about yourself.</p>
            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
                />
              </div>
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Grade</label>
                <select
                  id="grade"
                  value={grade ?? ""}
                  onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-[#0171BB] focus:outline-none focus:ring-1 focus:ring-[#0171BB]"
                >
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Experience level</label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {EXPERIENCE_LEVELS.map(({ value, label, icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setExperienceLevel(value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition ${
                        experienceLevel === value
                          ? "border-[#0171BB] bg-[#0171BB]/10"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-2xl">{icon}</span>
                      <span className="font-medium text-gray-900">{label}</span>
                      <span className="text-xs text-gray-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-slide-in">
            <div className="flex justify-center">
              <div className="rounded-2xl bg-[#0171BB]/10 p-6">
                <Target className="h-16 w-16 text-[#0171BB]" />
              </div>
            </div>
            <h2 className="mt-6 text-xl font-bold text-gray-900">
              Select Your Competitive Events
            </h2>
            <p className="mt-1 text-gray-600">
              Choose 1–3 Ontario DECA events you plan to compete in. Search by
              name or code.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search events (e.g. PBM, SEM, Professional Selling)"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {selectedEventCodes.length}/3 selected
            </p>
            <div className="mt-4 max-h-[360px] space-y-6 overflow-y-auto pr-2">
              {categoryOrder.map((catLabel) => {
                const events = filteredGrouped[catLabel];
                if (!events?.length) return null;
                return (
                  <div key={catLabel}>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      {catLabel.toUpperCase()}
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
                            title={`${event.name} (${event.code})`}
                            className={`group relative flex items-start gap-2 rounded-xl border-2 p-4 text-left text-sm transition disabled:opacity-50 ${
                              selected
                                ? "border-[#0171BB] bg-[#0171BB]/10"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {selected && (
                              <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#0171BB]" />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-gray-900">{event.name}</span>
                              <span className="ml-1.5 text-xs text-gray-500">
                                ({event.code}) · {participants} participant{participants !== "1" ? "s" : ""}
                              </span>
                              {"ontario_note" in event && event.ontario_note && (
                                <p className="mt-1.5 hidden text-xs text-gray-500 group-hover:block sm:block">
                                  {String(event.ontario_note)}
                                </p>
                              )}
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
        )}

        {step === 4 && (
          <div className="animate-fade-slide-in">
            <div className="flex justify-center">
              <div className="rounded-2xl bg-green-100 p-6">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
            </div>
            <h1 className="mt-6 text-center text-2xl font-bold text-gray-900">
              You&apos;re all set!
            </h1>
            <p className="mt-2 text-center text-gray-600">
              Here&apos;s your profile preview:
            </p>
            <div className="mt-6 rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-0.5 text-gray-900">{fullName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Grade</dt>
                  <dd className="mt-0.5 text-gray-900">{grade ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Experience
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {EXPERIENCE_LEVELS.find((e) => e.value === experienceLevel)
                      ?.label ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Competitive events
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {selectedEventNames.length > 0
                      ? selectedEventNames.join(", ")
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={
              (step < TOTAL_STEPS && !canProceed()) || isSubmitting
            }
            className="flex items-center gap-2 rounded-lg bg-[#0171BB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#015a96] disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === TOTAL_STEPS ? (
              "Go to Dashboard"
            ) : (
              <>
                {step === 1 ? "Let's set up your profile" : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
