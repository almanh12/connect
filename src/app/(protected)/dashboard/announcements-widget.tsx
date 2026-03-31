"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Megaphone } from "lucide-react";
import type { Announcement } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";

const PRIORITY_STRIPE: Record<string, string> = {
  urgent: "bg-red-500",
  normal: "bg-[#0072CE]",
  fyi: "bg-gray-400",
};

function isNew(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return created > dayAgo;
}

interface AnnouncementsWidgetProps {
  announcements: Announcement[];
  /** When true, show all announcements and hide "See All" link */
  fullPage?: boolean;
}

export function AnnouncementsWidget({ announcements, fullPage }: AnnouncementsWidgetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Announcements
        </h3>
        {!fullPage && (
          <Link
            href="/announcements"
            className="text-xs font-medium text-[#0072CE] hover:underline"
          >
            See All
          </Link>
        )}
      </div>
      <ul className="mt-3 space-y-3">
        {announcements.length === 0 ? (
          <li>
            <EmptyState
              icon={Megaphone}
              title="No announcements yet"
              description="Your chapter officers will post updates here."
            />
          </li>
        ) : (
          (fullPage ? announcements : announcements.slice(0, 5)).map((ann) => {
            const priority = (ann.priority ?? "normal") as keyof typeof PRIORITY_STRIPE;
            const stripeColor = PRIORITY_STRIPE[priority] ?? PRIORITY_STRIPE.normal;
            const expanded = expandedId === ann.id;
            const showNew = isNew(ann.created_at);

            return (
              <li
                key={ann.id}
                className="flex overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition hover:border-gray-200"
              >
                <div className={`w-1 shrink-0 ${stripeColor}`} />
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : ann.id)}
                  className="flex flex-1 flex-col items-start gap-1 p-4 text-left"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {ann.title}
                        </p>
                        {showNew && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {format(new Date(ann.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    )}
                  </div>
                  {expanded && (
                    <div className="mt-3 w-full rounded bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {ann.content}
                    </div>
                  )}
                  {!expanded && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {ann.content}
                    </p>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
