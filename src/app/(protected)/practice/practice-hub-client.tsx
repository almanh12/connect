"use client";

import { useState, useMemo, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Star, History, TrendingUp, Target, Rocket, Trash2 } from "lucide-react";
import type { OntarioDecaEvent } from "@/lib/ontario-deca-data";
import {
  ONTARIO_DECA_EVENTS,
  CATEGORY_DISPLAY_NAMES,
  getEventsByCodes,
  getEventsGroupedByCategory,
  searchEvents,
  isOnlineEvent,
} from "@/lib/ontario-deca-data";
import {
  FilterChipBar,
  SectionHeader,
  PracticeEventCard,
  ViewToggle,
  SearchInput,
  EmptyState,
} from "./practice-components";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import {
  formatPracticeChartXLabel,
  formatSessionDateTime,
} from "@/lib/format-datetime";

interface PracticeSessionItem {
  id: string;
  event_code: string;
  event_category: string;
  category?: string | null;
  score: number | null;
  pi_scores?: Record<string, number> | null;
  feedback: string | null;
  duration_seconds?: number | null;
  created_at: string;
  case_study?: string | null;
  student_response?: string | null;
}

interface PracticeHubClientProps {
  profile: { interests?: string[] | null } | null;
  userEventCodes: string[];
  initialTab?: Tab;
  initialSessions: PracticeSessionItem[];
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
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  "Principles of Business Administration": "#2563eb",
  "Individual Series": "#059669",
  "Team Decision Making": "#7c3aed",
  "Personal Financial Literacy": "#ea580c",
  "Operations Research": "#0891b2",
  "Project Management": "#dc2626",
  "Entrepreneurship": "#ca8a04",
  "Integrated Marketing Campaigns": "#be185d",
  "Professional Selling and Consulting": "#4f46e5",
  "Online Events": "#6b7280",
};

function getCategoryLabel(event: OntarioDecaEvent): string {
  return CATEGORY_DISPLAY_NAMES[event.category_key] ?? event.category_key;
}

function getCategoryColor(categoryLabel: string): string {
  return CATEGORY_COLORS[categoryLabel] ?? "#6b7280";
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 50) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

type Tab = "all-events" | "practice-history";
type ViewMode = "grid" | "list";

export function PracticeHubClient({
  userEventCodes,
  initialSessions,
  initialTab = "all-events",
}: PracticeHubClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [sessions, setSessions] = useState<PracticeSessionItem[]>(initialSessions);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  // Sync sessions when initialSessions changes (e.g. server refresh)
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useLayoutEffect(() => {
    const activeIndex = activeTab === "all-events" ? 0 : 1;
    const el = tabRefs.current[activeIndex];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  const toggleCategory = useCallback((label: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const handleStartPractice = useCallback(
    (code: string) => {
      router.push("/practice/" + code);
    },
    [router]
  );

  const userEvents = useMemo(
    () => getEventsByCodes(userEventCodes).filter((e) => !isOnlineEvent(e)),
    [userEventCodes]
  );

  const groupedAll = useMemo(() => getEventsGroupedByCategory(), []);

  const searchFilteredEvents = useMemo(
    () => (searchQuery.trim() ? searchEvents(searchQuery).filter((e) => !isOnlineEvent(e)) : null),
    [searchQuery]
  );

  const categoryFilteredGrouped = useMemo(() => {
    const grouped = searchFilteredEvents
      ? (() => {
          const byCat: Record<string, OntarioDecaEvent[]> = {};
          for (const e of searchFilteredEvents) {
            const label = getCategoryLabel(e);
            if (!byCat[label]) byCat[label] = [];
            byCat[label].push(e);
          }
          return byCat;
        })()
      : groupedAll;
    if (!categoryFilter) return grouped;
    return grouped[categoryFilter] ? { [categoryFilter]: grouped[categoryFilter] } : {};
  }, [searchFilteredEvents, groupedAll, categoryFilter]);

  const flatFilteredEvents = useMemo(() => {
    if (!searchFilteredEvents) return [];
    if (!categoryFilter) return searchFilteredEvents;
    return searchFilteredEvents.filter((e) => getCategoryLabel(e) === categoryFilter);
  }, [searchFilteredEvents, categoryFilter]);

  const sessionsByEvent = useMemo(() => {
    const map = new Map<string, PracticeSessionItem[]>();
    for (const s of sessions) {
      const code = s.event_code || s.event_category;
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(s);
    }
    for (const sess of map.values()) {
      sess.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return map;
  }, [sessions]);

  const flatSessions = useMemo(() => {
    const flat = [...sessions];
    flat.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return flat;
  }, [sessions]);

  const filteredFlatSessions = useMemo(() => {
    if (!searchQuery.trim()) return flatSessions;
    const q = searchQuery.toLowerCase().trim();
    return flatSessions.filter((s) => {
      const code = s.event_code || s.event_category;
      const event = ONTARIO_DECA_EVENTS.find((e) => e.code === code);
      const name = event?.name?.toLowerCase() ?? "";
      const codeLower = code.toLowerCase();
      return name.includes(q) || codeLower.includes(q);
    });
  }, [flatSessions, searchQuery]);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      console.log("[practice] handleDeleteSession called for", id);
      setDeleteConfirmId(null);
      setExitingIds((prev) => new Set(prev).add(id));
      await new Promise((r) => setTimeout(r, 300));
      const res = await fetch(`/api/practice/delete?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success("Practice session deleted");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.error ?? "Could not delete practice session";
        console.error("[practice] Delete failed:", res.status, msg);
        toast.error(msg);
      }
    },
    [router]
  );

  const handleDeleteAll = useCallback(async () => {
    setShowDeleteAllConfirm(false);
    console.log("[practice] handleDeleteAll called");
    const res = await fetch("/api/practice/delete?all=true", { method: "DELETE" });
    if (res.ok) {
      setSessions([]);
      toast.success("All practice sessions deleted");
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      const msg = err.error ?? "Could not delete practice sessions";
      console.error("[practice] Delete all failed:", res.status, msg);
      toast.error(msg);
    }
  }, [router]);

  const chartDataByEvent = useMemo(() => {
    const result = new Map<
      string,
      { eventName: string; data: { label: string; score: number; session: number }[] }
    >();
    for (const [code, sess] of sessionsByEvent) {
      const withScores = sess
        .filter((s) => s.score != null && typeof s.score === "number")
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      if (withScores.length < 2) continue;
      const allDates = withScores.map((s) => new Date(s.created_at));
      const event = ONTARIO_DECA_EVENTS.find((e) => e.code === code);
      result.set(code, {
        eventName: event?.name ?? code,
        data: withScores.map((s, i) => ({
          label: formatPracticeChartXLabel(new Date(s.created_at), allDates),
          score: s.score!,
          session: i + 1,
        })),
      });
    }
    return result;
  }, [sessionsByEvent]);

  const totalEvents = useMemo(
    () => ONTARIO_DECA_EVENTS.filter((e) => !isOnlineEvent(e)).length,
    []
  );

  const categoryChipOptions = useMemo(() => {
    const cats = searchFilteredEvents
      ? [...new Set(searchFilteredEvents.map((e) => getCategoryLabel(e)))].sort()
      : CATEGORY_ORDER.filter((cat) => (groupedAll[cat]?.length ?? 0) > 0);
    return cats.map((cat) => ({
      value: cat,
      label: cat,
      color: getCategoryColor(cat),
    }));
  }, [searchFilteredEvents, groupedAll]);

  const filteredUserEvents = useMemo(() => {
    if (!categoryFilter) return userEvents;
    return userEvents.filter((e) => getCategoryLabel(e) === categoryFilter);
  }, [userEvents, categoryFilter]);

  const renderEventCards = (events: OntarioDecaEvent[]) => (
    <div
      className={
        viewMode === "grid"
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-3"
      }
    >
      {events.map((event) => (
        <PracticeEventCard
          key={event.code}
          event={event}
          categoryColor={getCategoryColor(getCategoryLabel(event))}
          practiceCount={sessionsByEvent.get(event.code)?.length ?? 0}
          highlight={userEventCodes.includes(event.code)}
          listView={viewMode === "list"}
          onStartPractice={handleStartPractice}
        />
      ))}
    </div>
  );

  const renderCategorySection = (catLabel: string, events: OntarioDecaEvent[]) => {
    const color = getCategoryColor(catLabel);
    const isCollapsed = collapsedCategories.has(catLabel);
    return (
      <section
        key={catLabel}
        id={`category-${catLabel.replace(/\s+/g, "-").toLowerCase()}`}
        className="practice-category-section"
      >
        <SectionHeader
          label={catLabel}
          count={events.length}
          color={color}
          isCollapsed={isCollapsed}
          onToggle={() => toggleCategory(catLabel)}
        />
        <div
          className="collapsible-content"
          style={{ maxHeight: isCollapsed ? 0 : 5000 }}
        >
          <div className="mt-4">{renderEventCards(events)}</div>
        </div>
      </section>
    );
  };

  const renderEventGrid = () =>
    CATEGORY_ORDER.filter((cat) => (categoryFilteredGrouped[cat]?.length ?? 0) > 0).map(
      (catLabel) => renderCategorySection(catLabel, categoryFilteredGrouped[catLabel] ?? [])
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Banner */}
      <div className="practice-banner relative overflow-hidden rounded-2xl px-6 py-8 sm:px-8 sm:py-10">
        <div className="hero-bg-overlay hero-bg-vignette-left" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "#ffffff" }}>
              Competition Practice
            </h1>
            <p className="mt-1 text-sm text-white/85 sm:text-base">
              Practice Ontario DECA events with AI feedback
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
              <span>
                <strong className="font-semibold text-white">{totalEvents}</strong> events
                available
              </span>
              <span aria-hidden>·</span>
              <span>
                <strong className="font-semibold text-white">
                  {sessions.length}
                </strong>{" "}
                practice sessions completed
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-center sm:justify-end">
            <div className="rounded-2xl bg-white/10 p-4">
              <Target className="h-12 w-12 text-white/90" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={
              activeTab === "practice-history"
                ? "Filter sessions by event name or code…"
                : "Search events by name or code…"
            }
            aria-label={
              activeTab === "practice-history"
                ? "Filter practice sessions"
                : "Search events"
            }
          />
          {activeTab === "all-events" && (
            <ViewToggle value={viewMode} onChange={setViewMode} />
          )}
        </div>
        {activeTab === "all-events" && categoryChipOptions.length > 0 && (
          <FilterChipBar
            options={categoryChipOptions}
            value={categoryFilter}
            onChange={(v) => {
              setCategoryFilter(v);
              if (v) {
                document
                  .getElementById(`category-${v.replace(/\s+/g, "-").toLowerCase()}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-with-indicator relative -mt-2 flex border-b border-[var(--gray-200)]">
        <button
          ref={(el) => { tabRefs.current[0] = el; }}
          type="button"
          onClick={() => setActiveTab("all-events")}
          className={`-mb-px border-b-2 border-transparent py-2.5 pr-6 text-sm font-medium transition ${
            activeTab === "all-events"
              ? "text-[#2563eb]"
              : "text-[var(--gray-400)] hover:text-[var(--gray-600)]"
          }`}
        >
          All Events
        </button>
        <button
          ref={(el) => { tabRefs.current[1] = el; }}
          type="button"
          onClick={() => setActiveTab("practice-history")}
          className={`-mb-px border-b-2 border-transparent py-2.5 pr-6 text-sm font-medium transition ${
            activeTab === "practice-history"
              ? "text-[#2563eb]"
              : "text-[var(--gray-400)] hover:text-[var(--gray-600)]"
          }`}
        >
          Practice History
        </button>
        <div
          className="tab-indicator"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      </div>

      {activeTab === "practice-history" ? (
        <div className="space-y-6">
          {chartDataByEvent.size > 0 && (
            <div className="rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--gray-900)]">
                <TrendingUp className="h-5 w-5 text-[var(--deca-blue)]" />
                Improvement Over Time
              </h2>
              <p className="mt-1 text-sm text-[var(--gray-600)]">
                Score trends for events with 2+ practice sessions
              </p>
              <div className="mt-4 space-y-8">
                {Array.from(chartDataByEvent.entries()).map(
                  ([code, { eventName, data }]) => (
                    <div key={code}>
                      <h3 className="mb-2 text-sm font-medium text-[var(--gray-700)]">
                        {eventName}
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--gray-500)" />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fontSize: 12 }}
                              stroke="var(--gray-500)"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--white)",
                                border: "1px solid var(--gray-200)",
                                borderRadius: "12px",
                              }}
                              formatter={(value: unknown) => [
                                `${value ?? 0}/100`,
                                "Score",
                              ]}
                              labelFormatter={(label) => `Session: ${label}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="var(--deca-blue)"
                              strokeWidth={2}
                              dot={{ fill: "var(--deca-blue)", r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--gray-900)]">
                  <History className="h-5 w-5" />
                  Practice History
                </h2>
                <p className="mt-1 text-sm text-[var(--gray-600)]">
                  Your recent practice sessions
                </p>
              </div>
              {filteredFlatSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="text-sm font-medium text-[var(--gray-500)] hover:text-red-600 transition-colors"
                >
                  Delete All ({filteredFlatSessions.length})
                </button>
              )}
            </div>
            {filteredFlatSessions.length === 0 ? (
              sessions.length === 0 ? (
                <div className="mt-8">
                  <EmptyState
                    icon={<Rocket className="h-12 w-12 text-[var(--deca-blue)]" strokeWidth={1.5} />}
                    title="No practice sessions yet"
                    description="Head to All Events and start your first practice!"
                    actionLabel="Go to All Events"
                    onAction={() => setActiveTab("all-events")}
                  />
                </div>
              ) : (
                <p className="mt-4 text-[var(--gray-500)]">No sessions match your search.</p>
              )
            ) : (
              <div className="mt-4 space-y-3">
                {filteredFlatSessions.map((session) => {
                  const code = session.event_code || session.event_category;
                  const event = ONTARIO_DECA_EVENTS.find((e) => e.code === code);
                  const categoryLabel = session.category ?? (event ? getCategoryLabel(event) : code);
                  const categoryColor = getCategoryColor(categoryLabel);
                  const isExiting = exitingIds.has(session.id);
                  const dateFormatted = formatSessionDateTime(session.created_at);
                  const timeSpent =
                    session.duration_seconds != null
                      ? session.duration_seconds >= 60
                        ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s`
                        : `${session.duration_seconds}s`
                      : null;
                  const score =
                    session.score ??
                    (session.feedback
                      ? (() => {
                          const fb = session.feedback;
                          const m =
                            fb.match(/\*\*Overall\s+Score\*\*[:\s]*(\d+)/i) ||
                            fb.match(/(?:Overall\s+)?Score[:\s]*(\d+)(?:\/100)?/i);
                          return m ? parseInt(m[1], 10) : null;
                        })()
                      : null);

                  return (
                    <div
                      key={session.id}
                      className={`rounded-xl border border-[var(--gray-200)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden transition-opacity duration-300 ${
                        isExiting ? "opacity-0" : "opacity-100"
                      }`}
                      style={{ borderTopWidth: 4, borderTopColor: categoryColor }}
                    >
                      <div className="flex w-full items-center justify-between gap-4 p-4">
                        <Link
                          href={`/practice/history/${session.id}`}
                          className="min-w-0 flex-1 text-left hover:opacity-90 transition-opacity"
                        >
                          <h3 className="font-semibold text-[var(--gray-900)]">
                            {event?.name ?? session.event_category}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                              style={{ backgroundColor: categoryColor }}
                            >
                              {code}
                            </span>
                            <span className="text-sm text-[var(--gray-500)]">{dateFormatted}</span>
                            {timeSpent && (
                              <span className="text-sm text-[var(--gray-500)]">· {timeSpent}</span>
                            )}
                          </div>
                          {score != null ? (
                            <span
                              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getScoreBadgeClass(score)}`}
                            >
                              {score}/100
                            </span>
                          ) : session.student_response || session.feedback ? (
                            <span className="mt-2 inline-block text-sm text-[var(--gray-500)]">
                              Evaluated (no score)
                            </span>
                          ) : (
                            <span className="mt-2 inline-block text-sm text-[var(--gray-500)]">
                              Not submitted
                            </span>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteConfirmId(session.id);
                          }}
                          className="shrink-0 rounded p-2 text-[var(--gray-400)] hover:bg-red-50 hover:text-red-600 transition-colors"
                          aria-label="Delete session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ConfirmDialog
            open={!!deleteConfirmId}
            onClose={() => setDeleteConfirmId(null)}
            title="Delete this practice session?"
            description="This cannot be undone."
            confirmLabel="Delete"
            variant="danger"
            onConfirm={async () => {
              if (deleteConfirmId) await handleDeleteSession(deleteConfirmId);
            }}
          />
          <ConfirmDialog
            open={showDeleteAllConfirm}
            onClose={() => setShowDeleteAllConfirm(false)}
            title={`Delete all ${filteredFlatSessions.length} practice sessions?`}
            description="This cannot be undone."
            confirmText="DELETE"
            confirmLabel="Delete All"
            variant="danger"
            onConfirm={handleDeleteAll}
          />
        </div>
      ) : searchFilteredEvents ? (
        <div className="space-y-6">
          {flatFilteredEvents.length === 0 ? (
            <div className="rounded-xl border border-[var(--gray-200)] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
              <p className="text-[var(--gray-600)]">
                No events match &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-sm font-medium text-[var(--deca-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] rounded"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">
                Search Results
                {flatFilteredEvents.length > 0 && (
                  <span className="ml-2 font-normal text-[var(--gray-500)]">
                    ({flatFilteredEvents.length})
                  </span>
                )}
              </h2>
              {renderEventCards(flatFilteredEvents)}
            </>
          )}
        </div>
      ) : (
        <>
          {filteredUserEvents.length > 0 && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--gray-900)]">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                Your Events
              </h2>
              {renderEventCards(filteredUserEvents)}
            </div>
          )}
          <div className="space-y-6">{renderEventGrid()}</div>
        </>
      )}
    </div>
  );
}
