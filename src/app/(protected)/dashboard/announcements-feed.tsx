"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, ChevronRight, Megaphone } from "lucide-react";

const PRIORITY_STRIPE: Record<string, string> = {
  urgent: "bg-[var(--error)]",
  normal: "bg-[var(--deca-blue)]",
  fyi: "bg-[var(--gray-400)]",
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-[var(--error-light)] text-[var(--error)]",
  normal: "bg-[var(--deca-blue-light)] text-[var(--deca-blue)]",
  fyi: "bg-[var(--gray-100)] text-[var(--gray-500)]",
};

const LAST_VISIT_KEY = "deca_dashboard_last_visit";

function getLastVisit(): number {
  if (typeof window === "undefined") return 0;
  try {
    const s = localStorage.getItem(LAST_VISIT_KEY);
    return s ? parseInt(s, 10) : 0;
  } catch {
    return 0;
  }
}

function setLastVisit() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export interface AnnouncementWithAuthor {
  id: string;
  title: string;
  body: string;
  priority?: string | null;
  created_at: string;
  user_id: string | null;
  author_name?: string | null;
}

interface AnnouncementsFeedProps {
  announcements: AnnouncementWithAuthor[];
  isOfficer?: boolean;
  /** When true, show only 2 items, compact padding (for dashboard sidebar) */
  compact?: boolean;
  /** When true, use dark navy background (for full-width dashboard section) */
  dark?: boolean;
}

export function AnnouncementsFeed({
  announcements,
  isOfficer = false,
  compact = false,
  dark = false,
}: AnnouncementsFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastVisit, setLastVisitState] = useState(0);

  useEffect(() => {
    setLastVisitState(getLastVisit());
    setLastVisit();
  }, []);

  const isNew = (createdAt: string) => {
    return new Date(createdAt).getTime() > lastVisit;
  };

  const limit = compact ? 2 : 5;

  return (
    <div
      className={`rounded-[16px] border shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
        compact ? "p-4" : "p-6"
      } ${dark ? "bg-[#0A1628] border-[#1E3A5F]" : "bg-white border-[#E8ECF0] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"}`}
    >
      <div className={`flex items-center justify-between pb-4 mb-4 border-b ${dark ? "border-[#1E3A5F]" : "border-[#F1F5F9]"}`}>
        <h3 className={`text-[13px] font-semibold uppercase tracking-[0.5px] ${dark ? "text-white" : "text-[#64748B]"}`}>
          Announcements
        </h3>
        {isOfficer && (
          <Link
            href="/admin/announcements"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              dark
                ? "border border-white/60 text-white hover:bg-white/10"
                : "bg-[var(--deca-blue)] text-white hover:bg-[var(--deca-blue-dark)]"
            }`}
          >
            Post
          </Link>
        )}
      </div>
      <ul className="space-y-2">
        {announcements.length === 0 ? (
          <li className="flex flex-col items-center justify-center py-8 text-center">
            <Megaphone className={`h-12 w-12 mb-3 ${dark ? "text-white/40" : compact ? "text-[var(--gray-300)]" : "text-[var(--gray-400)]"}`} strokeWidth={1.5} />
            <p className={`text-sm font-medium ${dark ? "text-white/90" : compact ? "text-[var(--gray-500)]" : "text-[var(--gray-600)]"}`}>
              No announcements yet
            </p>
            <p className={`mt-0.5 text-xs max-w-[200px] ${dark ? "text-white/60" : "text-[var(--gray-400)]"}`}>
              {isOfficer ? "Post an update to keep your chapter informed." : "Check back later for updates from your chapter."}
            </p>
          </li>
        ) : (
          announcements.slice(0, limit).map((ann) => {
            const priority = (ann.priority ?? "normal") as keyof typeof PRIORITY_STRIPE;
            const stripeColor = PRIORITY_STRIPE[priority] ?? PRIORITY_STRIPE.normal;
            const badgeColor = PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.normal;
            const expanded = expandedId === ann.id;
            const showNew = isNew(ann.created_at);

            return (
              <li
                key={ann.id}
                className={`flex overflow-hidden rounded-[var(--radius-sm)] border transition ${
                  dark
                    ? "border-white/20 bg-white/5 hover:border-white/30"
                    : "border-[#E8ECF0] bg-white hover:border-[#D0D7DE]"
                }`}
              >
                <div className={`w-1 shrink-0 ${stripeColor}`} />
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : ann.id)}
                  className="flex flex-1 flex-col items-start gap-1 p-4 text-left"
                >
                  <div className="flex w-full flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium ${dark ? "text-white" : "text-[var(--gray-900)]"}`}>
                          {ann.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}
                        >
                          {priority === "urgent"
                            ? "Urgent"
                            : priority === "fyi"
                              ? "FYI"
                              : "Normal"}
                        </span>
                        {showNew && (
                          <span className="rounded-full bg-[var(--success-light)] px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                            New
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 text-xs ${dark ? "text-white/60" : "text-[var(--gray-500)]"}`}>
                        {ann.author_name
                          ? `Posted by ${ann.author_name} · `
                          : ""}
                        {formatDistanceToNow(new Date(ann.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp className={`h-4 w-4 shrink-0 ${dark ? "text-white/60" : "text-[var(--gray-400)]"}`} />
                    ) : (
                      <ChevronDown className={`h-4 w-4 shrink-0 ${dark ? "text-white/60" : "text-[var(--gray-400)]"}`} />
                    )}
                  </div>
                  {expanded && (
                    <div className={`mt-3 w-full rounded-[var(--radius-sm)] p-3 text-sm whitespace-pre-wrap ${dark ? "bg-white/10 text-white/90" : "bg-white border border-[#E8ECF0] text-[var(--gray-700)]"}`}>
                      {ann.body}
                    </div>
                  )}
                  {!expanded && (
                    <p className={`mt-1 line-clamp-2 text-xs ${dark ? "text-white/70" : "text-[var(--gray-500)]"}`}>
                      {ann.body}
                    </p>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
      {announcements.length > 0 && (
        <Link
          href="/announcements"
          className={`mt-4 flex items-center justify-center gap-1 text-sm font-medium hover:underline ${dark ? "text-white/80 hover:text-white" : "text-[var(--deca-blue)]"}`}
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
