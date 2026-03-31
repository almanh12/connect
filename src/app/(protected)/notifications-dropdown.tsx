"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import type { NotificationItem } from "@/lib/notifications";

interface NotificationsDropdownProps {
  notifications: NotificationItem[];
}

export function NotificationsDropdown({
  notifications: initial,
}: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-[#6B7280] hover:bg-gray-100 hover:text-[#1A1A2E]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-dropdown-enter absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-[#1A1A2E]">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    dismissNotification(n.id);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  {n.body && (
                    <p className="line-clamp-2 text-xs text-gray-600">{n.body}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {format(new Date(n.created_at), "MMM d, h:mm a")}
                    {n.type === "announcement" && " · Announcement"}
                    {n.type === "event_reminder" && " · Reminder"}
                    {n.type === "mandatory_event" && " · Mandatory"}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
