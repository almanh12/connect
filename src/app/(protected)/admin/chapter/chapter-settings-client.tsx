"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Loader2, RefreshCw, Trash2, Users, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { updateChapter, regenerateInviteCode, deleteChapter } from "./actions";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Chapter } from "@/lib/types";

interface ChapterSettingsClientProps {
  chapter: Chapter;
  canEdit: boolean;
  memberCount: number;
}

export function ChapterSettingsClient({
  chapter,
  canEdit,
  memberCount,
}: ChapterSettingsClientProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState(chapter.invite_code);
  const [inviteLink, setInviteLink] = useState(chapter.invite_link ?? "");
  const [form, setForm] = useState({
    name: chapter.name,
    school_name: chapter.school_name ?? "",
    advisor_name: chapter.advisor_name ?? "",
  });
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = inviteLink || `${baseUrl}/join?code=${inviteCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied("code");
    toast.success("Invite code copied");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied("link");
    toast.success("Invite link copied");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await updateChapter(chapter.id, form);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Chapter updated");
    setIsEditing(false);
  };

  const handleRegenerate = async () => {
    setIsSubmitting(true);
    const result = await regenerateInviteCode(chapter.id);
    setIsSubmitting(false);
    setShowRegenConfirm(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.inviteCode) setInviteCode(result.inviteCode);
    if (result.inviteLink) setInviteLink(result.inviteLink);
    toast.success("New invite code generated");
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const result = await deleteChapter(chapter.id);
    setIsSubmitting(false);
    setShowDeleteConfirm(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Chapter deleted");
    window.location.href = "/chapter-setup";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-600 hover:text-gray-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Chapter Settings</h1>
      </div>

      {/* Chapter info card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">Chapter Info</h2>
        {isEditing && canEdit ? (
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Chapter Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">School Name</label>
              <input
                type="text"
                value={form.school_name}
                onChange={(e) => setForm((f) => ({ ...f, school_name: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Advisor Name</label>
              <input
                type="text"
                value={form.advisor_name}
                onChange={(e) => setForm((f) => ({ ...f, advisor_name: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#0072CE] px-4 py-2 font-semibold text-white hover:bg-[#004B87] disabled:opacity-50">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Chapter Name</dt>
                <dd className="text-gray-900">{chapter.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">School Name</dt>
                <dd className="text-gray-900">{chapter.school_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Advisor Name</dt>
                <dd className="text-gray-900">{chapter.advisor_name ?? "—"}</dd>
              </div>
            </dl>
            {canEdit && (
              <button type="button" onClick={() => setIsEditing(true)} className="mt-4 text-sm font-medium text-[#0072CE] hover:underline">
                Edit details
              </button>
            )}
          </>
        )}
      </div>

      {/* Quick stats */}
      <div className="flex gap-4">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-[#0072CE]/10 p-3">
            <Users className="h-6 w-6 text-[#0072CE]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{memberCount}</p>
            <p className="text-sm text-gray-500">Members</p>
          </div>
        </div>
      </div>

      {/* Invite section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">Invite Members</h2>
        <p className="mt-1 text-sm text-gray-500">Share the code or link so members can join your chapter.</p>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Invite Code</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded-xl bg-gray-100 px-5 py-3 font-mono text-2xl font-bold tracking-[0.2em] text-gray-900">
                  {inviteCode}
                </code>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-300 hover:bg-gray-50"
                >
                  {copied === "code" ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-600" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Invite Link</p>
              <div className="mt-2 flex gap-2">
                <input type="text" readOnly value={link} className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm" />
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  {copied === "link" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  Copy
                </button>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate invite code
              </button>
            )}
          </div>
          <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-4">
            <QRCodeSVG value={link} size={140} level="H" includeMargin />
            <p className="mt-2 text-xs text-gray-500">Scan to join</p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      {canEdit && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-6">
          <h2 className="font-semibold text-red-800">Danger Zone</h2>
          <p className="mt-1 text-sm text-red-700">
            Deleting the chapter will remove all members and cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete Chapter
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showRegenConfirm}
        onClose={() => setShowRegenConfirm(false)}
        onConfirm={handleRegenerate}
        title="Regenerate invite code?"
        description="The current invite code will stop working. Members who haven't joined yet will need the new code."
        confirmLabel="Regenerate"
        variant="default"
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete chapter?"
        description="This will permanently delete the chapter and remove all members. This cannot be undone."
        confirmText={chapter.name}
        confirmLabel="Delete Chapter"
        variant="danger"
      />
    </div>
  );
}
