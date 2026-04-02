"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { parseEventDateTime } from "@/lib/utils";
import { Copy, Check, Loader2, Pencil, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatDistanceToNow } from "date-fns";
import { updateChapter } from "@/app/(protected)/admin/chapter/actions";
import { toast } from "sonner";
import { ContentGrid } from "@/components/content-grid";
import {
  Calendar,
  Users,
  ClipboardCheck,
  Megaphone,
  ChevronRight,
} from "lucide-react";
import type { Chapter } from "@/lib/types";
import { getPublicAppOrigin } from "@/lib/public-origin";

type ActivityItem =
  | { type: "member_join"; name: string; at: string }
  | { type: "event_create"; title: string; at: string }
  | { type: "announcement"; title: string; at: string };

interface EventNeedingAttendance {
  id: string;
  title: string;
  date?: string | null;
  start_time: string;
}

interface OverviewClientProps {
  eventsNeedingAttendance: EventNeedingAttendance[];
  chapter: Chapter;
  canEdit: boolean;
  memberCount: number;
  eventsThisMonth: number;
  announcementsThisMonth: number;
  avgAttendanceRate: number;
  activityItems: ActivityItem[];
  competitorCount?: number;
}

const ACTIVITY_DOT: Record<string, string> = {
  member_join: "bg-[var(--deca-blue)]",
  event_create: "bg-[var(--success)]",
  announcement: "bg-[var(--warning)]",
};

export function OverviewClient({
  eventsNeedingAttendance,
  chapter,
  canEdit,
  memberCount,
  eventsThisMonth,
  announcementsThisMonth,
  avgAttendanceRate,
  activityItems,
  competitorCount = 0,
}: OverviewClientProps) {
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: chapter.name,
    school_name: chapter.school_name ?? "",
    advisor_name: chapter.advisor_name ?? "",
  });
  const [editingField, setEditingField] = useState<"name" | "school_name" | "advisor_name" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const link = `${getPublicAppOrigin()}/join?code=${chapter.invite_code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(chapter.invite_code);
    setCopied(true);
    toast.success("Invite code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFieldChange = (field: "name" | "school_name" | "advisor_name", value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSubmitting(true);
    const result = await updateChapter(chapter.id, form);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Chapter updated");
    setHasChanges(false);
    setEditingField(null);
  };

  const quickNav = [
    { href: "/admin/members", label: "Members", description: "Manage members, roles, and permissions", icon: Users },
    { href: "/admin/events", label: "Event Management", description: "Create events, manage attendance, QR codes", icon: Calendar },
    { href: "/admin/attendance", label: "Attendance", description: "Mark attendance, award points, export reports", icon: ClipboardCheck },
    { href: "/admin/announcements", label: "Announcements", description: "Post updates to your chapter members", icon: Megaphone },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Attendance needed alert */}
      {eventsNeedingAttendance.length > 0 && (
        <div className="attendance-alert flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--warning)]/20 border-l-4 border-l-[var(--warning)] bg-[var(--warning-light)] p-5 mb-4">
          <div className="attendance-alert-text">
            <h4 className="font-bold text-sm text-[#92400E] mb-1">
              ATTENDANCE NEEDED
            </h4>
            <p className="text-[13px] text-[#92400E]/80">
              {eventsNeedingAttendance.length === 1 ? (
                <>
                  &quot;{eventsNeedingAttendance[0].title}&quot; was scheduled for{" "}
                  {format(parseEventDateTime(eventsNeedingAttendance[0].start_time, eventsNeedingAttendance[0].date), "MMM d 'at' h:mm a")}.
                  Mark attendance for your chapter members.
                </>
              ) : (
                <>
                  {eventsNeedingAttendance.length} events need attendance marked.
                  Mark attendance for your chapter members.
                </>
              )}
            </p>
          </div>
          <Link
            href={
              eventsNeedingAttendance.length === 1
                ? `/admin/attendance/${eventsNeedingAttendance[0].id}`
                : "/admin/attendance"
            }
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--warning)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <AlertTriangle className="h-4 w-4" />
            Mark Attendance →
          </Link>
        </div>
      )}

      {/* Stats bar - clickable */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Link
          href="/admin/members"
          className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--deca-blue)] hover:shadow-[var(--shadow-md)] card-interactive cursor-pointer"
          style={{ borderLeftWidth: 4, borderLeftColor: "var(--deca-blue)" }}
        >
          <p className="text-2xl font-bold text-[var(--gray-900)]">{memberCount}</p>
          <p className="text-xs text-[var(--gray-500)] underline-offset-2 hover:underline">Members</p>
        </Link>
        <Link
          href="/admin/events"
          className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--deca-blue)] hover:shadow-[var(--shadow-md)] card-interactive cursor-pointer"
          style={{ borderLeftWidth: 4, borderLeftColor: "var(--success)" }}
        >
          <p className="text-2xl font-bold text-[var(--gray-900)]">{eventsThisMonth}</p>
          <p className="text-xs text-[var(--gray-500)] underline-offset-2 hover:underline">Events this month</p>
        </Link>
        <Link
          href="/admin/attendance"
          className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--deca-blue)] hover:shadow-[var(--shadow-md)] card-interactive cursor-pointer"
          style={{ borderLeftWidth: 4, borderLeftColor: "var(--deca-gold)" }}
        >
          <p className="text-2xl font-bold text-[var(--gray-900)]">{avgAttendanceRate}%</p>
          <p className="text-xs text-[var(--gray-500)] underline-offset-2 hover:underline">Avg attendance</p>
        </Link>
        <Link
          href="/admin/announcements"
          className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--deca-blue)] hover:shadow-[var(--shadow-md)] card-interactive cursor-pointer"
          style={{ borderLeftWidth: 4, borderLeftColor: "var(--tier-diamond)" }}
        >
          <p className="text-2xl font-bold text-[var(--gray-900)]">{announcementsThisMonth}</p>
          <p className="text-xs text-[var(--gray-500)] underline-offset-2 hover:underline">Announcements</p>
        </Link>
        <Link
          href="/events?tab=competition"
          className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--deca-blue)] hover:shadow-[var(--shadow-md)] card-interactive cursor-pointer"
          style={{ borderLeftWidth: 4, borderLeftColor: "#7c3aed" }}
        >
          <p className="text-2xl font-bold text-[var(--gray-900)]">{competitorCount}</p>
          <p className="text-xs text-[var(--gray-500)] underline-offset-2 hover:underline">Competitors</p>
        </Link>
      </div>

      {/* Chapter info + Invite - 7+5 layout */}
      <ContentGrid className="items-stretch gap-4">
        <div className="col-span-12 lg:col-span-7 flex">
          <div className="flex-1 min-h-0 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-4">
              Chapter Info
            </h3>
            <dl className="space-y-4">
              {(["name", "school_name", "advisor_name"] as const).map((field) => {
                const label = field === "name" ? "Chapter Name" : field === "school_name" ? "School Name" : "Advisor Name";
                const isEditing = editingField === field && canEdit;
                return (
                  <div key={field}>
                    <dt className="text-[13px] font-medium text-[var(--gray-500)] mb-1">{label}</dt>
                    <dd className="group flex items-center gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={form[field]}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                          className="flex-1 rounded-[var(--radius-sm)] border border-[var(--gray-200)] px-3 py-2 text-sm focus:border-[var(--deca-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--deca-blue)]"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="text-sm text-[var(--gray-900)]">
                            {form[field] || "—"}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setEditingField(field)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-[var(--radius-sm)] text-[var(--gray-400)] hover:bg-[var(--gray-100)] hover:text-[var(--deca-blue)] transition"
                              aria-label={`Edit ${label}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="mt-4 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--deca-blue-dark)] disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </button>
            )}
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5 flex">
          <div className="flex-1 min-h-0 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--gray-50)] p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-2">
              Invite Members
            </h3>
            <p className="text-sm text-[var(--gray-600)] mb-4">
              Share this code or link so members can join your chapter.
            </p>
            <div className="rounded-[var(--radius-sm)] border-2 border-dashed border-[var(--deca-blue-muted)]/40 bg-[var(--deca-blue-light)]/30 p-4 mb-4">
              <code className="block text-center font-mono text-2xl font-bold tracking-[0.15em] text-[var(--gray-900)]">
                {chapter.invite_code}
              </code>
              <button
                type="button"
                onClick={copyCode}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
              >
                {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
                Copy Code
              </button>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
            >
              Share Link
            </button>
            <div className="flex justify-center rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white p-4">
              <QRCodeSVG value={link} size={120} level="H" includeMargin />
            </div>
          </div>
        </div>
      </ContentGrid>

      {/* Quick navigation */}
      <div className="grid gap-4 sm:grid-cols-2">
        {quickNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex h-[100px] items-center gap-4 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--deca-blue)] hover:shadow-[var(--shadow-md)] card-interactive"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--deca-blue-light)] transition group-hover:bg-[var(--deca-blue)]">
              <item.icon className="h-5 w-5 text-[var(--deca-blue)] transition group-hover:text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-medium text-[var(--gray-900)]">{item.label}</h3>
              <p className="text-[13px] text-[var(--gray-500)]">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--deca-blue)]" />
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-4">
          Recent Activity
        </h3>
        {activityItems.length === 0 ? (
          <p className="text-sm text-[var(--gray-500)]">
            No recent activity yet. Actions like member joins and event creation will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {activityItems.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-[var(--gray-100)] pb-3 last:border-0 last:pb-0"
              >
                <span className="flex items-center gap-2 text-sm text-[var(--gray-700)]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ACTIVITY_DOT[item.type] ?? "var(--gray-400)" }}
                  />
                  {item.type === "member_join" && (
                    <>
                      <span className="font-medium">{item.name}</span> joined the chapter
                    </>
                  )}
                  {item.type === "event_create" && <>Event &quot;{item.title}&quot; was created</>}
                  {item.type === "announcement" && <>Announcement &quot;{item.title}&quot; was posted</>}
                </span>
                <span className="text-xs text-[var(--gray-400)]">
                  {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
