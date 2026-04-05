"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Play,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { StrategyRecord, StrategyActionStep } from "./actions";
import {
  createStrategies,
  updateStrategyStatus,
  updateStrategyDetails,
  toggleActionStep,
} from "./actions";
import { Avatar } from "@/components/avatar";

// ─── Intake form options ───────────────────────────────────────────────────

const CHALLENGES = [
  "Low membership / recruitment",
  "Poor event attendance",
  "Members aren't competing",
  "No engagement between meetings",
  "Leadership team is burnt out",
  "Budget / fundraising issues",
  "School administration support",
  "New chapter (starting from scratch)",
  "Member retention",
  "Communication issues",
] as const;

const CHALLENGE_COLORS: Record<string, string> = {
  "Low membership / recruitment": "bg-blue-500",
  "Poor event attendance": "bg-green-500",
  "Members aren't competing": "bg-amber-500",
  "No engagement between meetings": "bg-rose-500",
  "Leadership team is burnt out": "bg-violet-500",
  "Budget / fundraising issues": "bg-cyan-500",
  "School administration support": "bg-emerald-500",
  "New chapter (starting from scratch)": "bg-indigo-500",
  "Member retention": "bg-orange-500",
  "Communication issues": "bg-pink-500",
};

const TIMELINES = [
  "This week",
  "This month",
  "This semester",
  "Long-term planning",
] as const;

const RESOURCES = [
  "Advisor support",
  "Budget available",
  "Social media presence",
  "School event space",
  "Returning experienced members",
  "Strong officer team",
  "School club fair coming up",
] as const;

const RESOURCE_COLORS: Record<string, string> = {
  "Advisor support": "bg-blue-100 border-blue-300 text-blue-800",
  "Budget available": "bg-green-100 border-green-300 text-green-800",
  "Social media presence": "bg-amber-100 border-amber-300 text-amber-800",
  "School event space": "bg-rose-100 border-rose-300 text-rose-800",
  "Returning experienced members": "bg-violet-100 border-violet-300 text-violet-800",
  "Strong officer team": "bg-cyan-100 border-cyan-300 text-cyan-800",
  "School club fair coming up": "bg-emerald-100 border-emerald-300 text-emerald-800",
};

// ─── Priority & category colors ──────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-[#ef4444] text-white",
  medium: "bg-[#f59e0b] text-white",
  low: "bg-[#22c55e] text-white",
};

const TAG_COLORS: Record<string, string> = {
  recruitment: "bg-pink-100 text-pink-800",
  engagement: "bg-cyan-100 text-cyan-800",
  competition: "bg-purple-100 text-purple-800",
  culture: "bg-indigo-100 text-indigo-800",
  fundraising: "bg-amber-100 text-amber-800",
  attendance: "bg-blue-100 text-blue-800",
  retention: "bg-emerald-100 text-emerald-800",
};

/** Display-only: capitalize first letter per word; DB values unchanged. */
function capitalizeBadgeLabel(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

// ─── Props ───────────────────────────────────────────────────────────────────

type ChapterOfficer = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

interface StrategiesClientProps {
  initialStrategies: StrategyRecord[];
  officers: ChapterOfficer[];
}

// ─── Main component ────────────────────────────────────────────────────────

export function StrategiesClient({
  initialStrategies,
  officers,
}: StrategiesClientProps) {
  const router = useRouter();
  const [strategies, setStrategies] = useState<StrategyRecord[]>(initialStrategies);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setStrategies(initialStrategies);
  }, [initialStrategies]);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [expandedActiveId, setExpandedActiveId] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(true);

  const activeStrategies = strategies.filter((s) => s.status === "active");
  const newStrategies = strategies.filter((s) => s.status === "new");
  const completedStrategies = strategies.filter((s) => s.status === "completed");

  const handleGenerate = useCallback(
    async (intake: IntakeFormData) => {
      if (intake.challenges.length === 0) {
        toast.error("Please select at least one challenge.");
        return;
      }

      setIsGenerating(true);
      setIntakeOpen(false);

      try {
        const res = await fetch("/api/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenges: intake.challenges,
            description: intake.description,
            timeline: intake.timeline,
            resources: intake.resources,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err.error as string) ?? "Failed to generate");
        }

        const { strategies: newStrategies } = (await res.json()) as {
          strategies: {
            title: string;
            priority: string;
            tags: string[];
            problem_statement: string;
            action_steps: StrategyActionStep[];
            expected_impact: string;
            timeline: string;
            success_metrics: unknown[];
            intake_data: Record<string, unknown>;
          }[];
        };

        const result = await createStrategies(newStrategies);

        if (result.error) {
          throw new Error(result.error);
        }

        toast.success("Strategies generated!");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate strategies");
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const handleStartStrategy = useCallback(async (id: string) => {
    const result = await updateStrategyStatus(id, "active");
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "active" as const } : s))
    );
    setExpandedActiveId(id);
    toast.success("Strategy started!");
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    const result = await updateStrategyStatus(id, "dismissed");
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    toast.success("Strategy dismissed");
  }, []);

  const handleComplete = useCallback(async (id: string) => {
    const result = await updateStrategyStatus(id, "completed");
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "completed" as const } : s))
    );
    setExpandedActiveId(null);
    toast.success("Strategy completed!");
  }, []);

  const handleToggleStep = useCallback(async (strategyId: string, stepIndex: number, completed: boolean) => {
    const result = await toggleActionStep(strategyId, stepIndex, completed);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setStrategies((prev) =>
      prev.map((s) => {
        if (s.id !== strategyId) return s;
        const steps = [...s.action_steps];
        steps[stepIndex] = { ...steps[stepIndex]!, completed, completed_at: completed ? new Date().toISOString() : null };
        return { ...s, action_steps: steps };
      })
    );
  }, []);

  const handleUpdateDueDate = useCallback(async (id: string, dueDate: string | null) => {
    const result = await updateStrategyDetails(id, { due_date: dueDate });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, due_date: dueDate } : s))
    );
  }, []);

  const handleUpdateAssigned = useCallback(async (id: string, assignedTo: string | null) => {
    const result = await updateStrategyDetails(id, { assigned_to: assignedTo });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, assigned_to: assignedTo } : s))
    );
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIntakeOpen(true)}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--deca-blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:bg-[var(--deca-blue-dark)] disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          Generate New Strategies
        </button>
      </div>

      {intakeOpen && (
        <IntakeModal
          onClose={() => setIntakeOpen(false)}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}

      {activeStrategies.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--gray-900)]">
            Active Strategies
          </h2>
          <div className="space-y-4">
            {activeStrategies.map((s) => (
              <ActiveStrategyCard
                key={s.id}
                strategy={s}
                officers={officers}
                isExpanded={expandedActiveId === s.id}
                onToggleExpand={() =>
                  setExpandedActiveId((prev) => (prev === s.id ? null : s.id))
                }
                onToggleStep={(i, completed) => handleToggleStep(s.id, i, completed)}
                onUpdateDueDate={(d) => handleUpdateDueDate(s.id, d)}
                onUpdateAssigned={(a) => handleUpdateAssigned(s.id, a)}
                onComplete={() => handleComplete(s.id)}
              />
            ))}
          </div>
        </section>
      )}

      {newStrategies.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--gray-900)]">
            New Strategies
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {newStrategies.map((s) => (
              <NewStrategyCard
                key={s.id}
                strategy={s}
                onStart={() => handleStartStrategy(s.id)}
                onDismiss={() => handleDismiss(s.id)}
              />
            ))}
          </div>
        </section>
      )}

      {completedStrategies.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setCompletedExpanded(!completedExpanded)}
            className="mb-4 flex w-full items-center justify-between text-left text-lg font-semibold text-[var(--gray-900)]"
          >
            Completed Strategies ({completedStrategies.length})
            {completedExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          {completedExpanded && (
            <div className="grid gap-4 sm:grid-cols-2">
              {completedStrategies.map((s) => (
                <CompletedStrategyCard key={s.id} strategy={s} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeStrategies.length === 0 &&
        newStrategies.length === 0 &&
        completedStrategies.length === 0 &&
        !isGenerating && (
          <div className="rounded-xl border-2 border-dashed border-[var(--gray-200)] bg-[var(--gray-50)] p-12 text-center">
            <p className="text-[var(--gray-500)]">
              Click &quot;Generate New Strategies&quot; to specify your challenges and get
              AI-powered engagement ideas tailored to your chapter.
            </p>
          </div>
        )}
    </div>
  );
}

// ─── Intake form data ──────────────────────────────────────────────────────

interface IntakeFormData {
  challenges: string[];
  description: string;
  timeline: string;
  resources: string[];
}

// ─── Intake modal ───────────────────────────────────────────────────────────

function IntakeModal({
  onClose,
  onGenerate,
  isGenerating,
}: {
  onClose: () => void;
  onGenerate: (data: IntakeFormData) => void;
  isGenerating: boolean;
}) {
  const [step, setStep] = useState(1);
  const [challenges, setChallenges] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [timeline, setTimeline] = useState("This month");
  const [resources, setResources] = useState<Set<string>>(new Set());

  const toggleChallenge = (c: string) => {
    setChallenges((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const toggleResource = (r: string) => {
    setResources((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const canProceed = step === 1 ? challenges.size >= 1 : true;

  const handleNext = () => {
    if (step < 4) setStep((s) => s + 1);
    else {
      onGenerate({
        challenges: Array.from(challenges),
        description: description.trim(),
        timeline,
        resources: Array.from(resources),
      });
    }
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const content = (
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
          className="modal-content modal animate-modal-enter w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--gray-900)]">
            Generate New Strategies
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--gray-500)] hover:bg-[var(--gray-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-[var(--gray-200)]">
          <div
            className="h-full rounded-full bg-[var(--deca-blue)] transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        <p className="mb-6 text-xs font-medium text-[var(--gray-500)]">
          Step {step} of 4
        </p>

        {step === 1 && (
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">
              What&apos;s your biggest challenge right now?
            </label>
            <p className="mt-0.5 text-xs text-[var(--gray-500)]">
              Select at least one
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CHALLENGES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChallenge(c)}
                  className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
                    challenges.has(c)
                      ? `border-transparent ${CHALLENGE_COLORS[c] ?? "bg-blue-500"} text-white`
                      : "border-[var(--gray-300)] bg-white text-[var(--gray-700)] hover:border-[var(--gray-400)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">
              Tell us more (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Describe your specific situation... e.g., 'We have 15 members but only 3 show up to meetings' or 'Nobody wants to sign up for provincials'"
              rows={4}
              className="mt-2 w-full rounded-lg border border-[var(--gray-200)] px-4 py-3 text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:border-[var(--deca-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--deca-blue)]"
            />
            <p className="mt-1 text-right text-xs text-[var(--gray-500)]">
              {description.length}/500
            </p>
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">
              What&apos;s your timeline?
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {TIMELINES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeline(t)}
                  className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
                    timeline === t
                      ? "border-[var(--deca-blue)] bg-[var(--deca-blue)] text-white"
                      : "border-[var(--gray-300)] bg-white text-[var(--gray-700)] hover:border-[var(--gray-400)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">
              What resources do you have?
            </label>
            <p className="mt-0.5 text-xs text-[var(--gray-500)]">
              Optional — select any that apply
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {RESOURCES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleResource(r)}
                  className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
                    resources.has(r)
                      ? `border-transparent ${RESOURCE_COLORS[r] ?? "bg-blue-100 text-blue-800"}`
                      : "border-[var(--gray-200)] bg-white text-[var(--gray-700)]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--gray-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--gray-700)] disabled:opacity-50 hover:bg-[var(--gray-50)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isGenerating}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[var(--deca-blue-dark)]"
          >
            {step === 4 ? (
              isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Generate Strategies
                  <Sparkles className="h-4 w-4" />
                </>
              )
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

// ─── New strategy card ──────────────────────────────────────────────────────

function NewStrategyCard({
  strategy,
  onStart,
  onDismiss,
}: {
  strategy: StrategyRecord;
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-5 shadow-[var(--shadow-card)] transition">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-[var(--gray-900)]">{strategy.title}</h3>
        <div className="flex flex-shrink-0 gap-1">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              PRIORITY_STYLES[strategy.priority] ?? PRIORITY_STYLES.medium
            }`}
          >
            {capitalizeBadgeLabel(strategy.priority)}
          </span>
        </div>
      </div>

      {strategy.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {strategy.tags.map((t) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                TAG_COLORS[t.toLowerCase()] ?? "bg-[var(--gray-100)] text-[var(--gray-700)]"
              }`}
            >
              {capitalizeBadgeLabel(t)}
            </span>
          ))}
        </div>
      )}

      {strategy.problem_statement && (
        <p className="mt-3 text-sm italic text-[var(--gray-600)]">
          This addresses: {strategy.problem_statement}
        </p>
      )}

      {strategy.action_steps.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-[var(--gray-700)]">
          {strategy.action_steps.slice(0, 3).map((st, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[var(--gray-400)]">◦</span>
              {st.text}
            </li>
          ))}
          {strategy.action_steps.length > 3 && (
            <li className="text-xs text-[var(--gray-500)]">
              +{strategy.action_steps.length - 3} more steps
            </li>
          )}
        </ul>
      )}

      {strategy.expected_impact && (
        <div className="mt-3 rounded-lg bg-[var(--deca-blue-light)] p-3">
          <p className="text-xs font-medium text-[var(--deca-blue)]">Expected impact</p>
          <p className="mt-0.5 text-sm text-[var(--gray-800)]">{strategy.expected_impact}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--success)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          <Play className="h-3.5 w-3.5" />
          Start This Strategy
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--gray-200)] bg-white px-3 py-2 text-xs font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Active strategy card ───────────────────────────────────────────────────

function ActiveStrategyCard({
  strategy,
  officers,
  isExpanded,
  onToggleExpand,
  onToggleStep,
  onUpdateDueDate,
  onUpdateAssigned,
  onComplete,
}: {
  strategy: StrategyRecord;
  officers: ChapterOfficer[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleStep: (index: number, completed: boolean) => void;
  onUpdateDueDate: (date: string | null) => void;
  onUpdateAssigned: (id: string | null) => void;
  onComplete: () => void;
}) {
  const completedCount = strategy.action_steps.filter((s) => s.completed).length;
  const totalCount = strategy.action_steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const assignedOfficer = strategy.assigned_to
    ? officers.find((o) => o.id === strategy.assigned_to)
    : null;

  const daysRemaining = strategy.due_date
    ? Math.ceil((new Date(strategy.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="rounded-xl border-2 border-[var(--deca-blue)]/30 bg-white shadow-[var(--shadow-card)] overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-[var(--gray-900)]">{strategy.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--gray-500)]">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[strategy.priority] ?? PRIORITY_STYLES.medium}`}>
              {capitalizeBadgeLabel(strategy.priority)}
            </span>
            <span>{completedCount} of {totalCount} steps</span>
            {daysRemaining !== null && (
              <span className={daysRemaining < 0 ? "text-[var(--error)]" : ""}>
                {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assignedOfficer && (
            <Avatar
              src={assignedOfficer.avatar_url}
              name={assignedOfficer.full_name}
              size="sm"
              className="h-8 w-8"
            />
          )}
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      <div className="h-1.5 w-full bg-[var(--gray-200)]">
        <div
          className="h-full bg-[var(--deca-blue)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--gray-200)] p-5 space-y-4">
          {strategy.problem_statement && (
            <p className="text-sm italic text-[var(--gray-600)]">
              This addresses: {strategy.problem_statement}
            </p>
          )}

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--gray-500)]" />
              <input
                type="date"
                value={strategy.due_date ? strategy.due_date.slice(0, 10) : ""}
                onChange={(e) => onUpdateDueDate(e.target.value || null)}
                className="rounded border border-[var(--gray-200)] px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--gray-500)]" />
              <select
                value={strategy.assigned_to ?? ""}
                onChange={(e) => onUpdateAssigned(e.target.value || null)}
                className="rounded border border-[var(--gray-200)] px-2 py-1 text-sm"
              >
                <option value="">Unassigned</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name ?? "Unknown"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--gray-500)] mb-2">Action steps</p>
            <ul className="space-y-2">
              {strategy.action_steps.map((st, i) => (
                <li key={i} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={(e) => onToggleStep(i, e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[var(--gray-300)] text-[var(--deca-blue)] focus:ring-[var(--deca-blue)]"
                  />
                  <span className={st.completed ? "line-through text-[var(--gray-500)]" : "text-[var(--gray-800)]"}>
                    {st.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {strategy.expected_impact && (
            <div className="rounded-lg bg-[var(--deca-blue-light)] p-3">
              <p className="text-xs font-medium text-[var(--deca-blue)]">Expected impact</p>
              <p className="mt-0.5 text-sm">{strategy.expected_impact}</p>
            </div>
          )}

          {strategy.success_metrics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {strategy.success_metrics.map((m, i) => (
                <span
                  key={i}
                  className="rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)]"
                >
                  {typeof m === "string" ? m : JSON.stringify(m)}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark as Completed
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Completed strategy card ────────────────────────────────────────────────

function CompletedStrategyCard({ strategy }: { strategy: StrategyRecord }) {
  const completedAt = strategy.updated_at
    ? new Date(strategy.updated_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]/50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-[var(--gray-900)]">{strategy.title}</h3>
        <div className="flex items-center gap-2 text-[var(--success)]">
          <CheckCircle2 className="h-5 w-5" />
          {completedAt && (
            <span className="text-xs text-[var(--gray-500)]">{completedAt}</span>
          )}
        </div>
      </div>
      {strategy.expected_impact && (
        <p className="mt-2 text-sm text-[var(--gray-600)]">{strategy.expected_impact}</p>
      )}
    </div>
  );
}
