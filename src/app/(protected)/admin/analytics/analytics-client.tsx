"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Loader2, Sparkles, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Target } from "lucide-react";
import { toast } from "sonner";
import {
  getDateRangeBounds,
  getLastMonthBounds,
  type DateRange,
  type AnalyticsData,
} from "@/lib/analytics";
import { formatTierForDisplay } from "@/lib/points";
import { parseEventDateTime } from "@/lib/utils";

interface AnalyticsClientProps {
  data: AnalyticsData;
}

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "semester", label: "This semester" },
  { value: "all", label: "All time" },
];

const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "diamond"];
const ENGAGEMENT_COLORS = { Active: "#22c55e", "At-risk": "#eab308", Inactive: "#ef4444" };
/** Resolved hex for SVG — Recharts does not resolve CSS variables in fill/stroke */
const CHART_PRIMARY = "#0072CE";
const CHART_GRID = "#E2E5EA";

function eventInRange(
  event: { date?: string | null; start_time: string },
  start: Date | null,
  end: Date | null
): boolean {
  if (!start || !end) return true;
  const d = parseEventDateTime(event.start_time, event.date).getTime();
  return d >= start.getTime() && d <= end.getTime();
}

type InsightSection = { title: string; content: string; type: "well" | "concerns" | "actions" };

function parseInsightsSections(text: string): { sections: InsightSection[]; fallback: string | null } {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const splitRegex = /(?:^|\n)\s*(?:\d+\.\s*)?(?:#+\s*)?\*{0,2}(What'?s Going Well|Top Concerns|Recommended Actions This Week)\*{0,2}\s*[-:]?\s*\n?/gim;
  const parts = normalized.split(splitRegex).map((s) => s.trim());
  const typeMap: Record<string, "well" | "concerns" | "actions"> = {
    "What's Going Well": "well",
    "Whats Going Well": "well",
    "Top Concerns": "concerns",
    "Recommended Actions This Week": "actions",
  };
  const sections: InsightSection[] = [];
  for (let i = 1; i < parts.length - 1; i += 2) {
    const rawTitle = parts[i] ?? "";
    const title = rawTitle.replace(/What'?s/i, "What's");
    const content = parts[i + 1] ?? "";
    if (title && content) sections.push({ title, content, type: typeMap[title] ?? typeMap[rawTitle] ?? "well" });
  }
  if (sections.length === 0) return { sections: [], fallback: text };
  return { sections, fallback: null };
}

export function AnalyticsClient({ data }: AnalyticsClientProps) {
  const [range, setRange] = useState<DateRange>("month");
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<Date | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const bounds = useMemo(() => getDateRangeBounds(range), [range]);
  const lastMonthBounds = useMemo(() => getLastMonthBounds(), []);

  const { members, events, attendance, competitionEventIds, competitionRegistrations } = data;

  const filteredEvents = useMemo(
    () =>
      bounds
        ? events.filter((e) => eventInRange(e, bounds.start, bounds.end))
        : events,
    [events, bounds]
  );

  const filteredAttendance = useMemo(() => {
    const eventIds = new Set(filteredEvents.map((e) => e.id));
    return attendance.filter((a) => eventIds.has(a.event_id));
  }, [attendance, filteredEvents]);

  // Events that have attendance recorded (completed events only)
  const eventIdsWithAttendance = useMemo(() => {
    const set = new Set<string>();
    for (const a of filteredAttendance) set.add(a.event_id);
    return set;
  }, [filteredAttendance]);

  const completedEvents = useMemo(
    () => filteredEvents.filter((e) => eventIdsWithAttendance.has(e.id)),
    [filteredEvents, eventIdsWithAttendance]
  );

  const attendedByUser = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of filteredAttendance) {
      if (a.attended) {
        if (!map.has(a.user_id)) map.set(a.user_id, new Set());
        map.get(a.user_id)!.add(a.event_id);
      }
    }
    return map;
  }, [filteredAttendance]);

  const lastActivityByUser = useMemo(() => {
    const map = new Map<string, Date>();
    for (const a of attendance) {
      if (!a.attended) continue;
      const event = events.find((e) => e.id === a.event_id);
      if (!event) continue;
      const eventDate = parseEventDateTime(event.start_time, event.date);
      const current = map.get(a.user_id);
      if (!current || eventDate > current) {
        map.set(a.user_id, eventDate);
      }
    }
    return map;
  }, [attendance, events]);

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const metrics = useMemo(() => {
    const totalMembers = members.length;
    const membersLastMonth = members.filter(
      (m) => new Date(m.created_at) <= lastMonthBounds.end
    ).length;
    const memberDelta = totalMembers - membersLastMonth;

    const activeMembers = members.filter((m) => {
      const last = lastActivityByUser.get(m.id);
      return last && last >= thirtyDaysAgo;
    }).length;

    const totalEventAttendances = filteredAttendance.filter((a) => a.attended).length;
    const totalPossible = completedEvents.length * totalMembers;
    const avgAttendanceRate =
      totalPossible > 0 ? (totalEventAttendances / totalPossible) * 100 : 0;

    const compRsvps = attendance.filter(
      (a) => competitionEventIds.includes(a.event_id)
    ).length;
    const compParticipants = new Set(
      attendance.filter((a) => competitionEventIds.includes(a.event_id)).map((a) => a.user_id)
    ).size;
    const competitionRate =
      totalMembers > 0 ? (compParticipants / totalMembers) * 100 : 0;

    // Competition registrations (DECA event codes) — distinct from competition event attendance
    const regByUser = new Set(competitionRegistrations.map((r) => r.user_id));
    const registeredCount = regByUser.size;
    const eventsCovered = [...new Set(competitionRegistrations.map((r) => r.event_code))];
    const unregisteredMembers = members
      .filter((m) => !regByUser.has(m.id))
      .map((m) => m.full_name ?? "Unknown");
    const levelCounts = competitionRegistrations.reduce(
      (acc, r) => {
        const level = (r.competition_level ?? "regional").toLowerCase();
        acc[level] = (acc[level] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalMembers,
      memberDelta,
      activeMembers,
      avgAttendanceRate,
      competitionRate,
      competitionData: {
        registeredMembers: registeredCount,
        totalMembersForComp: totalMembers,
        eventsCovered: eventsCovered.length,
        eventsCoveredList: eventsCovered,
        levelCounts,
        unregisteredMemberNames: unregisteredMembers,
      },
    };
  }, [
    members,
    lastActivityByUser,
    thirtyDaysAgo,
    filteredAttendance,
    completedEvents,
    eventIdsWithAttendance,
    attendance,
    competitionEventIds,
    competitionRegistrations,
    lastMonthBounds.end,
  ]);

  const attendanceOverTime = useMemo(() => {
    const byWeek = new Map<string, number>();
    for (const e of completedEvents) {
      const d = parseEventDateTime(e.start_time, e.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().slice(0, 10);
      const count = filteredAttendance.filter(
        (a) => a.event_id === e.id && a.attended
      ).length;
      byWeek.set(key, (byWeek.get(key) ?? 0) + count);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({
        week: new Date(week + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        attendees: count,
      }));
  }, [completedEvents, filteredAttendance]);

  const eventPopularity = useMemo(() => {
    const byType = new Map<string, { total: number; count: number }>();
    for (const e of completedEvents) {
      const type = e.event_type ?? "other";
      const attended = filteredAttendance.filter(
        (a) => a.event_id === e.id && a.attended
      ).length;
      const current = byType.get(type) ?? { total: 0, count: 0 };
      byType.set(type, {
        total: current.total + attended,
        count: current.count + 1,
      });
    }
    return [...byType.entries()].map(([type, { total, count }]) => ({
      type: type.replace(/_/g, " "),
      avgAttendance: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    }));
  }, [completedEvents, filteredAttendance]);

  const engagementDistribution = useMemo(() => {
    let active = 0,
      atRisk = 0,
      inactive = 0;
    for (const m of members) {
      const last = lastActivityByUser.get(m.id);
      if (!last) {
        inactive++;
      } else if (last >= fourteenDaysAgo) {
        active++;
      } else if (last >= thirtyDaysAgo) {
        atRisk++;
      } else {
        inactive++;
      }
    }
    return [
      { name: "Active", value: active, color: ENGAGEMENT_COLORS.Active },
      { name: "At-risk", value: atRisk, color: ENGAGEMENT_COLORS["At-risk"] },
      { name: "Inactive", value: inactive, color: ENGAGEMENT_COLORS.Inactive },
    ].filter((d) => d.value > 0);
  }, [members, lastActivityByUser, fourteenDaysAgo, thirtyDaysAgo]);

  const tierDistribution = useMemo(() => {
    const byTier = new Map<string, number>();
    for (const t of TIER_ORDER) byTier.set(t, 0);
    for (const m of members) {
      const tier = (m.tier ?? "bronze").toLowerCase();
      byTier.set(tier, (byTier.get(tier) ?? 0) + 1);
    }
    return TIER_ORDER.map((t) => ({ tier: t, count: byTier.get(t) ?? 0 }));
  }, [members]);

  const funnelData = useMemo(() => {
    const signedUp = members.length;
    const completedOnboarding = members.filter((m) => m.onboarding_complete).length;
    const attendedFirst = members.filter((m) => attendedByUser.get(m.id)?.size).length;
    const compRsvp = members.filter((m) =>
      attendance.some(
        (a) => a.user_id === m.id && competitionEventIds.includes(a.event_id)
      )
    ).length;
    return [
      { name: "Signed up", value: signedUp, fill: "#3b82f6" },
      { name: "Completed onboarding", value: completedOnboarding, fill: "#6366f1" },
      { name: "Attended first event", value: attendedFirst, fill: "#8b5cf6" },
      { name: "RSVP'd to competition", value: compRsvp, fill: "#a855f7" },
    ];
  }, [members, attendedByUser, attendance, competitionEventIds]);

  const handleGenerateInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const res = await fetch("/api/analytics/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: {
            totalMembers: metrics.totalMembers,
            memberDelta: metrics.memberDelta,
            activeMembers: metrics.activeMembers,
            avgAttendanceRate: Math.round(metrics.avgAttendanceRate * 10) / 10,
            competitionRate: Math.round(metrics.competitionRate * 10) / 10,
            dateRange: range,
            attendanceOverTime,
            eventPopularity,
            engagementDistribution,
            tierDistribution,
            funnel: funnelData,
            competitionData: metrics.competitionData,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const { insights: text } = await res.json();
      setInsights(text ?? "");
      setInsightsGeneratedAt(new Date());
    } catch {
      toast.error("Failed to generate insights");
    } finally {
      setIsLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as DateRange)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Members"
          value={metrics.totalMembers}
          delta={metrics.memberDelta}
        />
        <MetricCard
          title="Active Members"
          value={metrics.activeMembers}
          subtitle="Last 30 days"
        />
        <MetricCard
          title="Avg Attendance Rate"
          value={`${Math.round(metrics.avgAttendanceRate * 10) / 10}%`}
        />
        <MetricCard
          title="Competition Participation"
          value={`${Math.round(metrics.competitionRate * 10) / 10}%`}
        />
      </div>

      {/* Charts */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <ChartCard title="Attendance Over Time">
          {attendanceOverTime.length === 0 ? (
            <ChartEmptyState message="No completed events with attendance in this period." />
          ) : (
            <ChartContainer>
              <LineChart data={attendanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="attendees"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART_PRIMARY }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Event Popularity (Avg Attendance)">
          {eventPopularity.length === 0 ? (
            <ChartEmptyState message="No event types with attendance data in this period." />
          ) : (
            <ChartContainer>
              <BarChart data={eventPopularity} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="type" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avgAttendance" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Member Engagement Distribution">
          {engagementDistribution.length === 0 ? (
            <ChartEmptyState message="No member engagement data to display." />
          ) : (
            <ChartContainer>
              <PieChart>
                <Pie
                  data={engagementDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {engagementDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Engagement Score by Tier">
          <ChartContainer>
            <BarChart data={tierDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis
                dataKey="tier"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatTierForDisplay(v)}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <ChartCard title="New Member Funnel" className="lg:col-span-2">
        <ChartContainer heightClass="h-[220px]">
          <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {funnelData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <LabelList dataKey="value" position="right" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCard>

      {/* AI Insights */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            {insightsGeneratedAt && !isLoadingInsights && (
              <p className="mt-1 text-xs text-gray-500">
                Last updated: {formatInsightsTimestamp(insightsGeneratedAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerateInsights}
            disabled={isLoadingInsights}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004B87] disabled:opacity-50"
          >
            {isLoadingInsights ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Insights
              </>
            )}
          </button>
        </div>
        {isLoadingInsights && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-6 py-8">
            <div className="flex gap-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <p className="text-sm text-gray-600">Analyzing your chapter data...</p>
          </div>
        )}
        {insights && !isLoadingInsights && (
          <div className="mt-6 space-y-4">
            {(() => {
              const { sections, fallback } = parseInsightsSections(insights);
              if (sections.length > 0) {
                return sections.map((s, i) => (
                  <InsightSectionCard key={`${s.type}-${i}`} section={s} />
                ));
              }
              return (
                <div className="insights-markdown rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
                  <ReactMarkdown components={insightMarkdownComponents}>
                    {fallback ?? insights}
                  </ReactMarkdown>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function formatInsightsTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const INSIGHT_CARD_STYLES = {
  well: {
    borderColor: "#059669",
    headerBg: "#ecfdf5",
    icon: CheckCircle2,
  },
  concerns: {
    borderColor: "#ea580c",
    headerBg: "#fff7ed",
    icon: AlertTriangle,
  },
  actions: {
    borderColor: "#2563eb",
    headerBg: "#eff6ff",
    icon: Target,
  },
} as const;

function InsightSectionCard({ section }: { section: InsightSection }) {
  const style = INSIGHT_CARD_STYLES[section.type];
  const Icon = style.icon;
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        borderLeft: `4px solid ${style.borderColor}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="flex items-center gap-2 px-6 py-3"
        style={{ backgroundColor: style.headerBg }}
      >
        <Icon className="h-5 w-5 shrink-0" style={{ color: style.borderColor }} />
        <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
      </div>
      <div className="insights-markdown px-6 py-5">
        <ReactMarkdown components={insightMarkdownComponents}>{section.content}</ReactMarkdown>
      </div>
    </div>
  );
}

const insightMarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-4 text-2xl font-bold text-gray-900">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-3 mt-6 text-xl font-semibold text-gray-900">{children}</h2>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed text-gray-600">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-gray-600">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-5 text-gray-600">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
};

function MetricCard({
  title,
  value,
  delta,
  subtitle,
}: {
  title: string;
  value: number | string;
  delta?: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {delta !== undefined && delta !== 0 && (
          <span
            className={`flex items-center text-sm font-medium ${
              delta > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {delta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

function ChartContainer({
  children,
  heightClass = "h-[300px]",
}: {
  children: React.ReactElement;
  heightClass?: string;
}) {
  return (
    <div className={`w-full min-w-0 ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] w-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}
