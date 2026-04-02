"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./actions";
import type { Announcement } from "@/lib/types";
import type { AnnouncementPriority } from "@/lib/types";

const PRIORITIES: { value: AnnouncementPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "normal", label: "Normal" },
  { value: "fyi", label: "FYI" },
];

interface AnnouncementsClientProps {
  announcements: Announcement[];
}

export function AnnouncementsClient({
  announcements: initial,
}: AnnouncementsClientProps) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPriority("normal");
    setShowForm(false);
    setShowPreview(false);
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setIsSubmitting(true);
    const result = await createAnnouncement(title, content, priority);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Announcement posted");
      resetForm();
      router.refresh();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !title.trim()) return;
    setIsSubmitting(true);
    const result = await updateAnnouncement(editingId, title, content, priority);
    setIsSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Announcement updated");
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? { ...a, title: title.trim(), body: content.trim(), priority }
            : a
        )
      );
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const result = await deleteAnnouncement(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Announcement deleted");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const startEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.body);
    setPriority((ann.priority as AnnouncementPriority) ?? "normal");
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="rounded-lg bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#004B87]"
        >
          {showForm ? "Cancel" : "New Announcement"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={editingId ? handleUpdate : handleCreate}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
                placeholder="Announcement title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Body
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
                placeholder="Write your announcement (markdown supported)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="mt-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? "Hide Preview" : "Preview"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2 text-sm font-medium text-white hover:bg-[#004B87] disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Post"}
              </button>
            </div>
            {showPreview && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Preview</p>
                <h3 className="mt-2 font-semibold text-gray-900">{title || "(No title)"}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {content || "(No content)"}
                </p>
              </div>
            )}
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Past Announcements</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {announcements.length === 0 ? (
            <li className="px-6 py-8 text-center text-sm text-gray-500">
              No announcements yet
            </li>
          ) : (
            announcements.map((ann) => (
              <li key={ann.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{ann.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                    {ann.body}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {format(new Date(ann.created_at), "MMM d, yyyy")} ·{" "}
                    {ann.priority ?? "normal"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(ann)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ann.id)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
