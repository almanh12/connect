"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Trophy, Plus, Users, UserPlus, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getEventsGroupedByCategory,
  getEventByCode,
  isOnlineEvent,
  isTeamEvent,
} from "@/lib/ontario-deca-data";
import type { OntarioDecaEvent } from "@/lib/ontario-deca-data";
import {
  COMPETITION_LEVELS,
  LEVEL_COLORS,
  formatLevelDisplay,
} from "@/lib/competition-levels";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const STATUS_COLORS: Record<string, string> = {
  registered: "#6b7280",
  confirmed: "#059669",
  completed: "#2563eb",
  withdrawn: "#ef4444",
};

const CATEGORY_ORDER = [
  "Principles of Business Administration",
  "Individual Series",
  "Team Decision Making",
  "Personal Financial Literacy",
  "Operations Research",
  "Project Management",
  "Entrepreneurship",
  "Integrated Marketing Campaigns",
  "Professional Selling and Consulting",
];

export interface CompetitionRegistration {
  id: string;
  user_id: string;
  event_code: string;
  event_name: string;
  competition_level: string;
  status: string;
  partner_id: string | null;
  created_at: string;
}

export interface ChapterMember {
  id: string;
  full_name: string | null;
}

interface CompetitionTabProps {
  userId: string;
  isAdmin: boolean;
  chapterMembers: ChapterMember[];
  initialRegistrations: CompetitionRegistration[];
}

export function CompetitionTab({
  userId,
  isAdmin,
  chapterMembers,
  initialRegistrations,
}: CompetitionTabProps) {
  const [registrations, setRegistrations] = useState<CompetitionRegistration[]>(initialRegistrations);
  const [loading, setLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/competition");
      if (res.ok) {
        const { registrations: regs } = await res.json();
        setRegistrations(regs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const myRegistrations = registrations.filter((r) => r.user_id === userId);
  const groupedEvents = getEventsGroupedByCategory();
  const competitionEvents = Object.fromEntries(
    Object.entries(groupedEvents).filter(
      ([, events]) => events.some((e) => !isOnlineEvent(e))
    )
  );

  const totalRegistered = new Set(registrations.map((r) => r.user_id)).size;
  const eventsCovered = new Set(registrations.map((r) => r.event_code)).size;
  const totalMembers = chapterMembers.length;
  const unregisteredCount = totalMembers - totalRegistered;

  const handleRegister = async (data: {
    event_code: string;
    event_name: string;
    competition_level: string;
    partner_id?: string | null;
  }) => {
    const res = await fetch("/api/competition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to register");
      return;
    }
    toast.success("Registered for competition event");
    setShowRegisterForm(false);
    fetchRegistrations();
  };

  const handleAddRegistration = async (data: {
    user_id: string;
    event_code: string;
    event_name: string;
    competition_level: string;
    partner_id?: string | null;
  }) => {
    const res = await fetch("/api/competition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to add registration");
      return;
    }
    toast.success("Registration added");
    setShowAddForm(false);
    fetchRegistrations();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/competition/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    toast.success("Status updated");
    setEditId(null);
    fetchRegistrations();
  };

  const handleDelete = async (id: string) => {
    setDeleteId(null);
    const res = await fetch(`/api/competition/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Registration removed");
    fetchRegistrations();
  };

  const getPartnerName = (pid: string | null) => {
    if (!pid) return null;
    return chapterMembers.find((m) => m.id === pid)?.full_name ?? null;
  };

  const renderPartnerDisplay = (reg: CompetitionRegistration) => {
    const event = getEventByCode(reg.event_code);
    const isTeam = event ? isTeamEvent(event) : false;
    const partnerName = getPartnerName(reg.partner_id);
    if (partnerName) return partnerName;
    if (isTeam) return <span className="text-amber-600 font-medium">No partner assigned</span>;
    return <span className="text-[var(--gray-500)]">Individual</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Admin stats */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-[var(--gray-500)]">Registered Members</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gray-900)]">{totalRegistered}</p>
            <p className="text-xs text-[var(--gray-500)]">of {totalMembers} total</p>
          </div>
          <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-[var(--gray-500)]">Events Covered</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gray-900)]">{eventsCovered}</p>
          </div>
          <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-[var(--gray-500)]">Unregistered</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gray-900)]">{unregisteredCount}</p>
          </div>
        </div>
      )}

      {/* Member: My Competition Events */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--gray-900)]">
          <Trophy className="h-5 w-5 text-[var(--deca-gold)]" />
          My Competition Events
        </h2>
        {myRegistrations.length === 0 ? (
          <div className="mt-4 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]/50 p-8 text-center">
            <p className="text-[var(--gray-600)]">
              You haven&apos;t registered for any competition events yet. Sign up to start competing!
            </p>
            <button
              type="button"
              onClick={() => setShowRegisterForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--deca-blue-dark)]"
            >
              <Plus className="h-4 w-4" />
              Register for Event
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {myRegistrations.map((reg) => (
              <div
                key={reg.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--gray-200)] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              >
                <div>
                  <h3 className="font-semibold text-[var(--gray-900)]">{reg.event_name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--deca-blue-muted)] px-2 py-0.5 text-xs font-medium text-[var(--deca-blue)]">
                      {reg.event_code}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: LEVEL_COLORS[reg.competition_level] ?? "#6b7280" }}
                    >
                      {formatLevelDisplay(reg.competition_level)}
                    </span>
                    {(() => {
                      const event = getEventByCode(reg.event_code);
                      const isTeam = event ? isTeamEvent(event) : false;
                      const partnerName = getPartnerName(reg.partner_id);
                      if (partnerName) return <span className="text-sm text-[var(--gray-600)]">Partner: {partnerName}</span>;
                      if (isTeam) return <span className="text-sm font-medium text-amber-600">No partner assigned</span>;
                      return <span className="text-sm text-[var(--gray-500)]">Individual</span>;
                    })()}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: STATUS_COLORS[reg.status] ?? "#6b7280" }}
                    >
                      {reg.status}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteId(reg.id)}
                  className="rounded p-2 text-[var(--gray-400)] hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove registration"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowRegisterForm(true)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--deca-blue)] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Register for another event
            </button>
          </div>
        )}
      </div>

      {/* Admin: Full table + bulk */}
      {isAdmin && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--gray-900)]">
            <Users className="h-5 w-5" />
            All Registrations
          </h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--deca-blue-dark)]"
            >
              <UserPlus className="h-4 w-4" />
              Add Registration
            </button>
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--deca-blue)] bg-white px-4 py-2 text-sm font-medium text-[var(--deca-blue)] hover:bg-[var(--deca-blue-light)]"
            >
              <Users className="h-4 w-4" />
              Bulk Register
            </button>
          </div>
          {showBulkModal && (
            <BulkRegisterModal
              members={chapterMembers}
              events={competitionEvents}
              onClose={() => setShowBulkModal(false)}
              onConfirm={async (userIds, event, level) => {
                let done = 0;
                for (const uid of userIds) {
                  const res = await fetch("/api/competition", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user_id: uid,
                      event_code: event.code,
                      event_name: event.name,
                      competition_level: level,
                    }),
                  });
                  if (res.ok) done++;
                }
                fetchRegistrations();
                toast.success(`Registered ${done} member(s)`);
                setShowBulkModal(false);
              }}
            />
          )}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--gray-400)]" />
            </div>
          ) : registrations.length === 0 ? (
            <p className="rounded-xl border border-[var(--gray-200)] bg-white p-8 text-center text-[var(--gray-500)]">
              No registrations yet
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--gray-200)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                    <th className="p-3 text-left">Member</th>
                    <th className="p-3 text-left">Event</th>
                    <th className="p-3 text-left">Level</th>
                    <th className="p-3 text-left">Partner</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const member = chapterMembers.find((m) => m.id === reg.user_id);
                    const name = member?.full_name ?? "Unknown";
                    return (
                      <tr key={reg.id} className="border-b border-[var(--gray-100)]">
                        <td className="p-3 font-medium">{name}</td>
                        <td className="p-3">
                          <span className="font-medium">{reg.event_name}</span>
                          <span className="ml-1 text-[var(--gray-500)]">({reg.event_code})</span>
                        </td>
                        <td className="p-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: LEVEL_COLORS[reg.competition_level] ?? "#6b7280" }}
                          >
                            {formatLevelDisplay(reg.competition_level)}
                          </span>
                        </td>
                        <td className="p-3 text-[var(--gray-600)]">
                          {renderPartnerDisplay(reg)}
                        </td>
                        <td className="p-3">
                          {editId === reg.id ? (
                            <select
                              value={reg.status}
                              onChange={(e) => handleUpdateStatus(reg.id, e.target.value)}
                              onBlur={() => setEditId(null)}
                              autoFocus
                              className="rounded border border-[var(--gray-200)] px-2 py-1 text-sm"
                            >
                              {["registered", "confirmed", "completed", "withdrawn"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditId(reg.id)}
                              className="rounded-full px-2 py-0.5 text-xs font-medium text-white hover:opacity-90"
                              style={{ backgroundColor: STATUS_COLORS[reg.status] ?? "#6b7280" }}
                            >
                              {reg.status}
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteId(reg.id)}
                            className="rounded p-1.5 text-[var(--gray-400)] hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Register form modal */}
      {showRegisterForm && (
        <RegisterFormModal
          eventsByCategory={competitionEvents}
          members={chapterMembers}
          onClose={() => setShowRegisterForm(false)}
          onSubmit={handleRegister}
        />
      )}

      {/* Add registration modal (admin) */}
      {showAddForm && (
        <AddRegistrationModal
          eventsByCategory={competitionEvents}
          members={chapterMembers}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddRegistration}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Remove registration?"
        description="This will remove this competition registration."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={async () => {
          if (deleteId) await handleDelete(deleteId);
        }}
      />
    </div>
  );
}

function BulkRegisterModal({
  members,
  events,
  onClose,
  onConfirm,
}: {
  members: ChapterMember[];
  events: Record<string, OntarioDecaEvent[]>;
  onClose: () => void;
  onConfirm: (
    userIds: string[],
    event: { code: string; name: string },
    level: string
  ) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [eventSelect, setEventSelect] = useState<{ code: string; name: string } | null>(null);
  const [level, setLevel] = useState("regional");
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventSelect || selected.size === 0) return;
    setSubmitting(true);
    await onConfirm([...selected], eventSelect, level);
    setSubmitting(false);
  };

  const content = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div
          className="modal animate-modal-enter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-xl"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Bulk Register</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--gray-400)] hover:bg-[var(--gray-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Event</label>
            <select
              value={eventSelect?.code ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                for (const list of Object.values(events)) {
                  const ev = list.find((x) => x.code === v);
                  if (ev && !isOnlineEvent(ev)) {
                    setEventSelect({ code: ev.code, name: ev.name });
                    return;
                  }
                }
                setEventSelect(null);
              }}
              required
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Select event...</option>
              {CATEGORY_ORDER.map((cat) => {
                const list = events[cat];
                if (!list?.length) return null;
                return (
                  <optgroup key={cat} label={cat}>
                    {list.filter((e) => !isOnlineEvent(e)).map((e) => (
                      <option key={e.code} value={e.code}>
                        {e.name} ({e.code})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            >
              {COMPETITION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {formatLevelDisplay(l)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Select members ({selected.size} selected)</label>
            <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--gray-200)] p-2">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 py-1.5 px-2 rounded hover:bg-[var(--gray-50)]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="rounded border-[var(--gray-300)] text-[var(--deca-blue)]"
                  />
                  <span className="text-sm">{m.full_name ?? "Unknown"}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !eventSelect || selected.size === 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Register {selected.size} member(s)
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

function RegisterFormModal({
  eventsByCategory,
  members,
  onClose,
  onSubmit,
}: {
  eventsByCategory: Record<string, OntarioDecaEvent[]>;
  members: ChapterMember[];
  onClose: () => void;
  onSubmit: (data: {
    event_code: string;
    event_name: string;
    competition_level: string;
    partner_id?: string | null;
  }) => Promise<void>;
}) {
  const [eventCode, setEventCode] = useState("");
  const [level, setLevel] = useState("regional");
  const [partnerId, setPartnerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const flatEvents: OntarioDecaEvent[] = [];
  for (const list of Object.values(eventsByCategory)) {
    flatEvents.push(...list.filter((e) => !isOnlineEvent(e)));
  }
  const selectedEvent = flatEvents.find((e) => e.code === eventCode);
  const isTeam = selectedEvent ? isTeamEvent(selectedEvent) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setSubmitting(true);
    await onSubmit({
      event_code: selectedEvent.code,
      event_name: selectedEvent.name,
      competition_level: level,
      partner_id: partnerId || null,
    });
    setSubmitting(false);
  };

  const content = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div
          className="modal animate-modal-enter max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-xl"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Register for Event</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--gray-400)] hover:bg-[var(--gray-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">Event</label>
            <select
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm"
            >
              <option value="">Select event...</option>
              {CATEGORY_ORDER.map((cat) => {
                const list = eventsByCategory[cat];
                if (!list?.length) return null;
                return (
                  <optgroup key={cat} label={cat}>
                    {list.filter((e) => !isOnlineEvent(e)).map((e) => (
                      <option key={e.code} value={e.code}>
                        {e.name} ({e.code})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">Competition Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm"
            >
              {COMPETITION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {formatLevelDisplay(l)}
                </option>
              ))}
            </select>
          </div>
          {isTeam && (
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)]">Partner (optional)</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ?? "Unknown"}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--gray-200)] px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !eventCode}
              className="flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--deca-blue-dark)] disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Register
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

function AddRegistrationModal({
  eventsByCategory,
  members,
  onClose,
  onSubmit,
}: {
  eventsByCategory: Record<string, OntarioDecaEvent[]>;
  members: ChapterMember[];
  onClose: () => void;
  onSubmit: (data: {
    user_id: string;
    event_code: string;
    event_name: string;
    competition_level: string;
    partner_id?: string | null;
  }) => Promise<void>;
}) {
  const [userId, setUserId] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [level, setLevel] = useState("regional");
  const [partnerId, setPartnerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const flatEvents: OntarioDecaEvent[] = [];
  for (const list of Object.values(eventsByCategory)) {
    flatEvents.push(...list.filter((e) => !isOnlineEvent(e)));
  }
  const selectedEvent = flatEvents.find((e) => e.code === eventCode);
  const isTeam = selectedEvent ? isTeamEvent(selectedEvent) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !userId) return;
    setSubmitting(true);
    await onSubmit({
      user_id: userId,
      event_code: selectedEvent.code,
      event_name: selectedEvent.name,
      competition_level: level,
      partner_id: partnerId || null,
    });
    setSubmitting(false);
  };

  const content = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div
          className="modal animate-modal-enter max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--gray-200)] bg-white p-6 shadow-xl"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add Registration</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--gray-400)] hover:bg-[var(--gray-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">Member</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm"
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? "Unknown"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">Event</label>
            <select
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm"
            >
              <option value="">Select event...</option>
              {CATEGORY_ORDER.map((cat) => {
                const list = eventsByCategory[cat];
                if (!list?.length) return null;
                return (
                  <optgroup key={cat} label={cat}>
                    {list.filter((e) => !isOnlineEvent(e)).map((e) => (
                      <option key={e.code} value={e.code}>
                        {e.name} ({e.code})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--gray-700)]">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm"
            >
              {COMPETITION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {formatLevelDisplay(l)}
                </option>
              ))}
            </select>
          </div>
          {isTeam && (
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)]">Partner (optional)</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {members.filter((m) => m.id !== userId).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name ?? "Unknown"}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !userId || !eventCode}
              className="flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  );
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
