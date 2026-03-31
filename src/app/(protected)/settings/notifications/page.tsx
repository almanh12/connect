import type { Metadata } from "next";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Notification Preferences",
  description: "Manage your notification settings.",
};

const NOTIFICATION_KEYS = [
  { key: "new_events", label: "New event announcements", description: "When new events are added to the chapter" },
  { key: "event_reminders", label: "Event reminders", description: "1 day before scheduled events" },
  { key: "mandatory_alerts", label: "Mandatory event alerts", description: "Reminders for mandatory events" },
  { key: "points_earned", label: "Points earned", description: "When you earn engagement points" },
  { key: "leaderboard_changes", label: "Leaderboard rank changes", description: "When your rank changes" },
  { key: "new_announcements", label: "New announcements", description: "When officers post announcements" },
] as const;

export default function NotificationPreferencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Preferences"
        description="Choose which notifications you want to receive."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Notifications" },
        ]}
        backHref="/settings"
      />
      <NotificationPreferencesForm notificationKeys={NOTIFICATION_KEYS} />
    </div>
  );
}
