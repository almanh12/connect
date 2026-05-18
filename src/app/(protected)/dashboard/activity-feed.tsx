"use client";

import { formatDistanceToNow } from "date-fns";
import {
  UserCheck,
  Calendar,
  Zap,
  Megaphone,
  Trophy,
} from "lucide-react";

export type ActivityItem =
  | { type: "attendance"; name: string; eventTitle: string; at: string }
  | { type: "new_event"; title: string; at: string }
  | { type: "points"; points: number; at: string }
  | { type: "announcement"; title: string; at: string };

const ICONS = {
  attendance: UserCheck,
  new_event: Calendar,
  points: Zap,
  announcement: Megaphone,
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        <p className="mt-3 text-sm text-gray-500">No recent activity yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
      <ul className="mt-3 space-y-3">
        {items.slice(0, 10).map((item, i) => {
          const Icon = ICONS[item.type];
          const label =
            item.type === "attendance"
              ? `${item.name} attended ${item.eventTitle}`
              : item.type === "new_event"
                ? `New event: ${item.title}`
                : item.type === "points"
                  ? `You earned ${item.points} points!`
                  : `New announcement: ${item.title}`;
          return (
            <li
              key={`${item.type}-${item.at}-${i}`}
              className="flex items-start gap-3 rounded-lg py-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
