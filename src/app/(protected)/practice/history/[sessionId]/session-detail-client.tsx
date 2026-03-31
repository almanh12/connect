"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Check, TrendingUp, FileText, MessageSquare, Sparkles } from "lucide-react";
import { ONTARIO_DECA_EVENTS } from "@/lib/ontario-deca-data";
import { parseDecaCaseFormat, parseLegacyCaseFormat } from "@/lib/deca-case-parser";
import { formatSessionDateTimeDetail } from "@/lib/format-datetime";

interface Session {
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

interface SessionDetailClientProps {
  session: Session;
}

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

function getScoreColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 50) return "#ca8a04";
  return "#dc2626";
}

function getScoreBgClass(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 50) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function SessionDetailClient({ session }: SessionDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"case" | "response" | "feedback">("case");
  const event = ONTARIO_DECA_EVENTS.find((e) => e.code === session.event_code);
  const categoryColor = (session.category && CATEGORY_COLORS[session.category]) || "#6b7280";

  const resolvedScore =
    session.score ??
    (session.feedback
      ? (() => {
          const m = session.feedback.match(/(?:Overall\s+)?Score[:\s]*(\d+)(?:\/100)?/i);
          return m ? parseInt(m[1], 10) : null;
        })()
      : null);

  const dateFormatted = formatSessionDateTimeDetail(session.created_at);

  const timeSpent =
    session.duration_seconds != null
      ? session.duration_seconds >= 60
        ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s`
        : `${session.duration_seconds}s`
      : null;

  const wordCount = session.student_response
    ? session.student_response.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const decaSections = session.case_study ? parseDecaCaseFormat(session.case_study) : null;
  const legacySections =
    session.case_study && !decaSections ? parseLegacyCaseFormat(session.case_study) : null;

  const piMax: Record<string, number> = {
    "Knowledge & Understanding": 30,
    "Critical Thinking & Problem Solving": 30,
    "Communication & Presentation Skills": 25,
    "Professional Presence & Poise": 15,
    "Executive Summary / Overview": 15,
    "Research & Analysis": 25,
    "Recommendations": 25,
    "Presentation Quality": 20,
    "Innovation & Creativity": 15,
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up">
      <Link
        href="/practice?tab=history"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--deca-blue)] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Practice History
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gray-900)]">
              {event?.name ?? session.event_category}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: categoryColor }}
              >
                {session.event_code}
              </span>
              <span className="text-sm text-[var(--gray-500)]">{dateFormatted}</span>
              {timeSpent && (
                <span className="text-sm text-[var(--gray-500)]">· {timeSpent}</span>
              )}
              {resolvedScore != null && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getScoreBgClass(resolvedScore)}`}
                >
                  {resolvedScore}/100
                </span>
              )}
            </div>
          </div>
          {resolvedScore != null && (
            <div className="flex shrink-0">
              <ScoreGauge score={resolvedScore} color={getScoreColor(resolvedScore)} />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 rounded-xl border border-[var(--gray-200)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex border-b border-[var(--gray-200)]">
          {[
            { id: "case" as const, label: "Case Study", icon: FileText },
            { id: "response" as const, label: "Your Response", icon: MessageSquare },
            { id: "feedback" as const, label: "AI Feedback", icon: Sparkles },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
                activeTab === id
                  ? "border-[var(--deca-blue)] text-[var(--deca-blue)]"
                  : "border-transparent text-[var(--gray-500)] hover:text-[var(--gray-700)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "case" && (
            <div className="space-y-6">
              {session.case_study ? (
                decaSections ? (
                  <>
                    <LabelValue label="Career Cluster" value={decaSections["CAREER CLUSTER"]} />
                    <LabelValue
                      label="Instructional Area"
                      value={decaSections["INSTRUCTIONAL AREA"]}
                    />
                    <LabelValue label="Event Name" value={decaSections["EVENT NAME"]} />
                    {decaSections["PARTICIPANT INSTRUCTIONS"] && (
                      <div className="rounded-lg bg-blue-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                          Participant Instructions
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--gray-800)]">
                          {decaSections["PARTICIPANT INSTRUCTIONS"]}
                        </p>
                      </div>
                    )}
                    {decaSections["21st CENTURY SKILLS"] && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                          21st Century Skills
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {decaSections["21st CENTURY SKILLS"]
                            .split(/\n/)
                            .map((s) => s.replace(/^[•\-]\s*/, "").trim())
                            .filter(Boolean)
                            .map((skill, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-[var(--deca-gold)]/20 px-3 py-1 text-sm font-medium text-[var(--gray-800)]"
                              >
                                {skill}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {decaSections["PERFORMANCE INDICATORS"] && (
                      <div className="rounded-lg border border-[var(--gray-200)] bg-white p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                          Performance Indicators
                        </p>
                        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-[var(--gray-800)]">
                          {decaSections["PERFORMANCE INDICATORS"]
                            .split(/\n/)
                            .map((s) => s.replace(/^[•\-]\s*/, "").trim())
                            .filter(Boolean)
                            .map((ind, i) => (
                              <li key={i} className="pl-1">
                                {ind}
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}
                    {decaSections["EVENT SITUATION"] && (
                      <div className="rounded-lg border-2 border-[var(--gray-200)] bg-white p-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                          Event Situation
                        </p>
                        <p className="mt-2 text-[15px] leading-[1.7] text-[var(--gray-900)] whitespace-pre-wrap">
                          {decaSections["EVENT SITUATION"]}
                        </p>
                      </div>
                    )}
                  </>
                ) : legacySections ? (
                  <div className="space-y-4">
                    {Object.entries(legacySections).map(([header, content]) => (
                      <div key={header}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                          {header}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--gray-800)]">
                          {content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] p-4">
                    <p className="text-sm leading-relaxed text-[var(--gray-700)] whitespace-pre-wrap">
                      {session.case_study}
                    </p>
                  </div>
                )
              ) : (
                <p className="text-[var(--gray-500)]">No case study recorded.</p>
              )}
            </div>
          )}

          {activeTab === "response" && (
            <div>
              {session.student_response ? (
                <div className="rounded-lg bg-[var(--gray-50)] p-6">
                  <p className="text-[15px] leading-[1.7] text-[var(--gray-800)] whitespace-pre-wrap">
                    {session.student_response}
                  </p>
                  <p className="mt-4 text-xs text-[var(--gray-500)]">
                    {wordCount} words
                    {timeSpent && ` · ${timeSpent}`}
                  </p>
                </div>
              ) : (
                <p className="text-[var(--gray-500)]">No response recorded.</p>
              )}
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="space-y-6">
              {session.feedback ? (
                <>
                  {resolvedScore != null && (
                    <div className="flex items-center gap-4">
                      <ScoreGauge score={resolvedScore} color={getScoreColor(resolvedScore)} />
                      <p
                        className="text-2xl font-bold"
                        style={{ color: getScoreColor(resolvedScore) }}
                      >
                        Overall Score: {resolvedScore}/100
                      </p>
                    </div>
                  )}
                  {session.pi_scores && Object.keys(session.pi_scores).length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-[var(--gray-700)]">
                        Performance Indicator Breakdown
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(session.pi_scores).map(([pi, s]) => {
                          const max = piMax[pi] ?? 30;
                          const pct = Math.round((s / max) * 100);
                          const barColor =
                            pct >= 80 ? "#059669" : pct >= 60 ? "#ca8a04" : "#dc2626";
                          return (
                            <div
                              key={pi}
                              className="rounded-lg border border-[var(--gray-200)] p-3"
                            >
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-[var(--gray-800)]">{pi}</span>
                                <span className="text-[var(--gray-600)]">
                                  {s}/{max}
                                </span>
                              </div>
                              <div
                                className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--gray-200)]"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none">
                    <ParsedFeedback text={session.feedback} />
                  </div>
                </>
              ) : (
                <p className="text-[var(--gray-500)]">No AI feedback recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link
          href={`/practice/${encodeURIComponent(session.event_code)}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--deca-blue)] hover:underline"
        >
          Practice again
        </Link>
      </div>
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-[var(--gray-800)]">{value}</p>
    </div>
  );
}

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, score);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const stroke = (pct / 100) * circ;
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="-rotate-90" width={96} height={96}>
        <circle
          cx={48}
          cy={48}
          r={r}
          fill="none"
          stroke="var(--gray-200)"
          strokeWidth={8}
        />
        <circle
          cx={48}
          cy={48}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - stroke}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span
        className="absolute text-lg font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function ParsedFeedback({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let currentListType: "strengths" | "improvements" | null = null;

  const flushList = () => {
    if (currentList.length > 0 && currentListType) {
      const borderClass =
        currentListType === "strengths" ? "border-l-emerald-500" : "border-l-amber-500";
      const Icon = currentListType === "strengths" ? Check : TrendingUp;
      elements.push(
        <div
          key={elements.length}
          className={`my-4 rounded-r-lg border-l-4 bg-[var(--gray-50)] p-4 ${borderClass}`}
        >
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--gray-800)]">
            <Icon className="h-4 w-4" />
            {currentListType === "strengths" ? "Strengths" : "Areas for Improvement"}
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--gray-700)]">
            {currentList.map((item, i) => (
              <li key={i}>{item.replace(/^[-•]\s*/, "")}</li>
            ))}
          </ul>
        </div>
      );
      currentList = [];
      currentListType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^\*\*Strengths:\*\*/i.test(trimmed) || /^Strengths:/i.test(trimmed)) {
      flushList();
      currentListType = "strengths";
      const after = trimmed.replace(/^\*\*Strengths:\*\*\s*/i, "").replace(/^Strengths:\s*/i, "").trim();
      if (after) currentList.push(after);
    } else if (
      /^\*\*Areas for Improvement:\*\*/i.test(trimmed) ||
      /^Areas for Improvement:/i.test(trimmed)
    ) {
      flushList();
      currentListType = "improvements";
      const after = trimmed
        .replace(/^\*\*Areas for Improvement:\*\*\s*/i, "")
        .replace(/^Areas for Improvement:\s*/i, "")
        .trim();
      if (after) currentList.push(after);
    } else if (
      /^\*\*Overall:\*\*/i.test(trimmed) ||
      /^\*\*Judge's Summary:\*\*/i.test(trimmed) ||
      /^Overall:/i.test(trimmed)
    ) {
      flushList();
      const content = trimmed
        .replace(/^\*\*Overall:\*\*\s*/i, "")
        .replace(/^\*\*Judge's Summary:\*\*\s*/i, "")
        .replace(/^Overall:\s*/i, "")
        .trim();
      elements.push(
        <div
          key={elements.length}
          className="my-4 rounded-lg border-l-4 border-[var(--deca-blue)] bg-blue-50/50 p-4 italic"
        >
          {content}
        </div>
      );
    } else if (currentListType && /^[-•]\s*.+/.test(trimmed)) {
      currentList.push(trimmed);
    } else {
      flushList();
      elements.push(
        <div key={elements.length} className="mb-4 prose prose-sm max-w-none">
          <ReactMarkdown>{line}</ReactMarkdown>
        </div>
      );
    }
  }
  flushList();

  if (elements.length > 0) {
    return <div className="space-y-2">{elements}</div>;
  }
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
