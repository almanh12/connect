"use client";

import { useState, useMemo, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  MoreVertical,
  UserPlus,
  UserMinus,
  Shield,
  User,
  X,
  LayoutGrid,
  List,
  Gift,
  Download,
  ChevronRight,
} from "lucide-react";
import {
  promoteToAdmin,
  demoteToMember,
  removeFromChapter,
  bulkAwardPoints,
  awardPointsToMember,
} from "./actions";
import { getMemberProfile, type MemberProfileData } from "./get-member-profile";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar } from "@/components/avatar";
import type { Profile } from "@/lib/types";
import { getRoleLabel } from "@/lib/roles";
import { formatTierForDisplay } from "@/lib/points";

const TIERS = ["bronze", "silver", "gold", "platinum", "diamond"];
const ROLES = ["owner", "admin", "member"];
const PAGE_SIZE = 20;

type ViewMode = "cards" | "table";
type SortKey = "name" | "score" | "last_active" | "grade";
type ActivityStatus = "active" | "at_risk" | "inactive" | "all";

interface MemberWithLastActive extends Profile {
  last_active: string | null;
}

interface MembersClientProps {
  members: MemberWithLastActive[];
  currentUserId: string;
  isOwner: boolean;
}

function getActivityStatus(lastActive: string | null): ActivityStatus | "all" {
  if (!lastActive) return "inactive";
  const d = new Date(lastActive).getTime();
  const now = Date.now();
  const daysSince = (now - d) / (24 * 60 * 60 * 1000);
  if (daysSince <= 14) return "active";
  if (daysSince <= 30) return "at_risk";
  return "inactive";
}

export function MembersClient({
  members: initialMembers,
  currentUserId,
  isOwner,
}: MembersClientProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterActivity, setFilterActivity] = useState<ActivityStatus>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<MemberProfileData | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [bulkAwardOpen, setBulkAwardOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [bulkPoints, setBulkPoints] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [roleConfirm, setRoleConfirm] = useState<{
    memberId: string;
    memberName: string;
    newRole: "admin" | "member";
  } | null>(null);

  const filters = useMemo(() => {
    const f: { key: string; label: string; onRemove: () => void }[] = [];
    if (filterGrade !== "all")
      f.push({
        key: "grade",
        label: `Grade ${filterGrade}`,
        onRemove: () => setFilterGrade("all"),
      });
    if (filterRole !== "all")
      f.push({
        key: "role",
        label: getRoleLabel(filterRole),
        onRemove: () => setFilterRole("all"),
      });
    if (filterTier !== "all")
      f.push({
        key: "tier",
        label: filterTier,
        onRemove: () => setFilterTier("all"),
      });
    if (filterActivity !== "all")
      f.push({
        key: "activity",
        label:
          filterActivity === "active"
            ? "Active"
            : filterActivity === "at_risk"
              ? "At Risk"
              : "Inactive",
        onRemove: () => setFilterActivity("all"),
      });
    return f;
  }, [filterGrade, filterRole, filterTier, filterActivity]);

  const filteredMembers = useMemo(() => {
    let list = members.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.full_name?.toLowerCase().includes(q) &&
          !m.email?.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterGrade !== "all" && m.grade !== parseInt(filterGrade, 10))
        return false;
      if (filterRole !== "all") {
        const effectiveRole = ["officer", "advisor"].includes(m.role) ? "admin" : m.role;
        if (effectiveRole !== filterRole) return false;
      }
      if (filterTier !== "all" && (m.tier ?? "bronze").toLowerCase() !== filterTier) return false;
      if (filterActivity !== "all") {
        const status = getActivityStatus(m.last_active);
        if (status !== filterActivity) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name")
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      if (sortBy === "score")
        return (b.engagement_score ?? 0) - (a.engagement_score ?? 0);
      if (sortBy === "grade")
        return (a.grade ?? 0) - (b.grade ?? 0);
      if (sortBy === "last_active") {
        const ta = a.last_active ? new Date(a.last_active).getTime() : 0;
        const tb = b.last_active ? new Date(b.last_active).getTime() : 0;
        return tb - ta;
      }
      return 0;
    });
    return list;
  }, [
    members,
    search,
    filterGrade,
    filterRole,
    filterTier,
    filterActivity,
    sortBy,
  ]);

  const visibleMembers = useMemo(
    () => filteredMembers.slice(0, visibleCount),
    [filteredMembers, visibleCount]
  );
  const hasMore = filteredMembers.length > visibleCount;
  const loadMore = () => setVisibleCount((c) => c + PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, filterGrade, filterRole, filterTier, filterActivity, sortBy]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredMembers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredMembers.map((m) => m.id)));
    }
  };

  const openDrawer = async (memberId: string) => {
    setDrawerMemberId(memberId);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const result = await getMemberProfile(memberId);
      if ("error" in result) {
        toast.error(result.error);
        setDrawerMemberId(null);
      } else {
        setDrawerData(result);
      }
    } catch {
      toast.error("Failed to load profile");
      setDrawerMemberId(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "member") => {
    setOpenMenu(null);
    setRoleConfirm(null);
    const result = await (newRole === "admin" ? promoteToAdmin(userId) : demoteToMember(userId));
    if (result.error) toast.error(result.error);
    else {
      const name = members.find((m) => m.id === userId)?.full_name ?? "Member";
      toast.success(newRole === "admin" ? `${name} is now an Admin` : `${name} is now a Member`);
      setMembers((m) =>
        m.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );
      if (drawerData?.profile.id === userId)
        setDrawerData({
          ...drawerData,
          profile: { ...drawerData.profile, role: newRole },
        });
    }
  };

  const openRoleConfirm = (member: MemberWithLastActive, newRole: "admin" | "member") => {
    setOpenMenu(null);
    setRoleConfirm({
      memberId: member.id,
      memberName: member.full_name ?? "Member",
      newRole,
    });
  };

  const handleRemove = async (userId: string) => {
    setOpenMenu(null);
    const result = await removeFromChapter(userId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Member removed");
      setMembers((m) => m.filter((p) => p.id !== userId));
      if (drawerMemberId === userId) setDrawerMemberId(null);
    }
  };

  const handleBulkAward = async () => {
    const points = parseInt(bulkPoints, 10);
    if (isNaN(points) || points <= 0 || selected.size === 0) {
      toast.error("Enter valid points and select members");
      return;
    }
    const result = await bulkAwardPoints(
      Array.from(selected),
      points,
      bulkReason
    );
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Awarded ${points} points to ${selected.size} members`);
      setBulkAwardOpen(false);
      setBulkPoints("");
      setBulkReason("");
      setSelected(new Set());
      router.refresh();
    }
  };

  const exportCsv = () => {
    const ids = selected.size > 0 ? Array.from(selected) : filteredMembers.map((m) => m.id);
    const toExport = members.filter((m) => ids.includes(m.id));
    const headers = [
      "Name",
      "Email",
      "Grade",
      "Role",
      "Tier",
      "Score",
      "Last Active",
    ];
    const rows = toExport.map((m) => [
      m.full_name ?? "",
      m.email ?? "",
      m.grade ?? "",
      m.role ?? "",
      m.tier ?? "",
      m.engagement_score ?? 0,
      m.last_active ? format(new Date(m.last_active), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map(String).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin"
          className="text-[#0072CE] hover:underline"
        >
          ← Back
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Member Management</h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4"
          />
        </div>
        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="all">All grades</option>
          {[9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {getRoleLabel(r)}
            </option>
          ))}
        </select>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="all">All tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {formatTierForDisplay(t)}
            </option>
          ))}
        </select>
        <select
          value={filterActivity}
          onChange={(e) => setFilterActivity(e.target.value as ActivityStatus)}
          className="rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="all">All activity</option>
          <option value="active">Active</option>
          <option value="at_risk">At Risk</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="name">Sort by name</option>
          <option value="score">Sort by score</option>
          <option value="last_active">Sort by last active</option>
          <option value="grade">Sort by grade</option>
        </select>
        <div className="hidden md:flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg ${viewMode === "cards" ? "bg-[#0072CE] text-white" : "bg-gray-100 text-gray-600"}`}
            title="Cards view"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg ${viewMode === "table" ? "bg-[#0072CE] text-white" : "bg-gray-100 text-gray-600"}`}
            title="Table view"
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 rounded-full bg-[#0072CE]/10 px-3 py-1 text-sm text-[#0072CE]"
            >
              {f.label}
              <button
                type="button"
                onClick={f.onRemove}
                className="hover:text-[#004B87]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#0072CE]/30 bg-[#0072CE]/5 p-4">
          <span className="font-medium text-gray-900">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => setBulkAwardOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#C8A415] px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <Gift className="h-4 w-4" />
            Bulk Award Points
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export Selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Mobile: always cards */}
      <div className="md:hidden space-y-4">
        <div className="grid gap-4 grid-cols-1">
          {visibleMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner={isOwner}
              currentUserId={currentUserId}
              selected={selected.has(member.id)}
              onToggleSelect={() => toggleSelect(member.id)}
              onOpenMenu={() => setOpenMenu(openMenu === member.id ? null : member.id)}
              openMenu={openMenu === member.id}
              onCloseMenu={() => setOpenMenu(null)}
              onViewProfile={() => openDrawer(member.id)}
              onMakeAdmin={() => openRoleConfirm(member, "admin")}
              onRemoveAdmin={() => openRoleConfirm(member, "member")}
              onRemove={() => handleRemove(member.id)}
            />
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              onClick={loadMore}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
            >
              Load more ({filteredMembers.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Desktop: cards or table based on viewMode */}
      {viewMode === "cards" ? (
        <div className="hidden md:grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isOwner={isOwner}
              currentUserId={currentUserId}
              selected={selected.has(member.id)}
              onToggleSelect={() => toggleSelect(member.id)}
              onOpenMenu={() => setOpenMenu(openMenu === member.id ? null : member.id)}
              openMenu={openMenu === member.id}
              onCloseMenu={() => setOpenMenu(null)}
              onViewProfile={() => openDrawer(member.id)}
              onMakeAdmin={() => openRoleConfirm(member, "admin")}
              onRemoveAdmin={() => openRoleConfirm(member, "member")}
              onRemove={() => handleRemove(member.id)}
            />
          ))}
          {hasMore && (
            <div className="col-span-full flex justify-center py-4">
              <button
                type="button"
                onClick={loadMore}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
              >
                Load more ({filteredMembers.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={
                      filteredMembers.length > 0 &&
                      selected.size === filteredMembers.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Grade
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Score
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Tier
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Last Active
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDrawer(member.id)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(member.id)}
                      onChange={() => toggleSelect(member.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.avatar_url}
                        name={member.full_name}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {member.full_name ?? "—"}
                          </p>
                          <RoleBadge role={member.role} />
                        </div>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {member.grade ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <RoleCell
                      member={member}
                      currentUserId={currentUserId}
                      isOwner={isOwner}
                      onMakeAdmin={() => openRoleConfirm(member, "admin")}
                      onRemoveAdmin={() => openRoleConfirm(member, "member")}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {member.engagement_score}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {member.tier ? formatTierForDisplay(member.tier) : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {member.last_active
                      ? formatDistanceToNow(new Date(member.last_active), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(openMenu === member.id ? null : member.id);
                        }}
                        className="rounded-lg p-2 hover:bg-gray-100"
                        aria-label="Open menu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenu === member.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenu(null)}
                          />
                          <MemberMenu
                            member={member}
                            isOwner={isOwner}
                            currentUserId={currentUserId}
                            onViewProfile={() => openDrawer(member.id)}
                            onMakeAdmin={() => openRoleConfirm(member, "admin")}
                            onRemoveAdmin={() => openRoleConfirm(member, "member")}
                            onRemove={() => handleRemove(member.id)}
                            onClose={() => setOpenMenu(null)}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="flex justify-center border-t border-gray-200 py-4">
              <button
                type="button"
                onClick={loadMore}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98]"
              >
                Load more ({filteredMembers.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-gray-500">
          No members found
        </div>
      )}

      {/* Member Profile Drawer */}
      {drawerMemberId && (
        <MemberProfileDrawer
          memberId={drawerMemberId}
          data={drawerData}
          loading={drawerLoading}
          onClose={() => {
            setDrawerMemberId(null);
            setDrawerData(null);
          }}
          isOwner={isOwner}
          currentUserId={currentUserId}
          onMakeAdmin={() =>
            drawerData && openRoleConfirm({ id: drawerData.profile.id, full_name: drawerData.profile.full_name } as MemberWithLastActive, "admin")
          }
          onRemoveAdmin={() =>
            drawerData && openRoleConfirm({ id: drawerData.profile.id, full_name: drawerData.profile.full_name } as MemberWithLastActive, "member")
          }
          onRemove={handleRemove}
        />
      )}

      {/* Role Change Confirmation */}
      {roleConfirm && (
        <ConfirmDialog
          open={!!roleConfirm}
          onClose={() => setRoleConfirm(null)}
          title={roleConfirm.newRole === "admin" ? "Make Admin" : "Remove Admin"}
          description={
            roleConfirm.newRole === "admin"
              ? `Are you sure you want to make ${roleConfirm.memberName} an Admin?`
              : `Are you sure you want to remove Admin access from ${roleConfirm.memberName}?`
          }
          confirmLabel={roleConfirm.newRole === "admin" ? "Make Admin" : "Remove Admin"}
          onConfirm={() => handleRoleChange(roleConfirm.memberId, roleConfirm.newRole)}
        />
      )}

      {/* Bulk Award Modal */}
      {bulkAwardOpen &&
        createPortal(
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
              onClick={() => {
                setBulkAwardOpen(false);
                setBulkPoints("");
                setBulkReason("");
              }}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="bulk-award-title"
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
                className="modal modal-content w-full max-w-md rounded-t-2xl sm:rounded-xl border border-gray-200 bg-white p-6 max-h-[90vh] overflow-y-auto animate-modal-enter"
                style={{ pointerEvents: "auto" }}
                onClick={(e) => e.stopPropagation()}
              >
            <h3 id="bulk-award-title" className="font-semibold text-gray-900">Bulk Award Points</h3>
            <p className="mt-1 text-sm text-gray-500">
              Award points to {selected.size} selected members
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Points
                </label>
                <input
                  type="number"
                  min={1}
                  value={bulkPoints}
                  onChange={(e) => setBulkPoints(e.target.value)}
                  className="modal-input mt-1 block w-full rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="modal-input mt-1 block w-full rounded-lg px-4 py-2"
                  placeholder="e.g. Chapter meeting participation"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBulkAwardOpen(false);
                  setBulkPoints("");
                  setBulkReason("");
                }}
                className="flex-1 min-h-[44px] rounded-lg border border-gray-300 py-2 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAward}
                className="flex-1 min-h-[44px] rounded-lg bg-[#0072CE] py-2 font-semibold text-white"
              >
                Award
              </button>
            </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const effective = ["officer", "advisor"].includes(role) ? "admin" : role;
  if (effective === "member") return null;
  const styles: Record<string, string> = {
    owner: "bg-amber-100 text-amber-800",
    admin: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[effective] ?? ""}`}>
      {getRoleLabel(role)}
    </span>
  );
}

function RoleCell({
  member,
  currentUserId,
  isOwner,
  onMakeAdmin,
  onRemoveAdmin,
}: {
  member: MemberWithLastActive;
  currentUserId: string;
  isOwner: boolean;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
}) {
  const effectiveRole = ["officer", "advisor"].includes(member.role) ? "admin" : member.role;
  const canEdit = isOwner && member.id !== currentUserId && member.role !== "owner";

  if (!canEdit) {
    return (
      <div className="flex items-center gap-2">
        <RoleBadge role={member.role} />
        {effectiveRole === "member" && <span className="text-sm text-gray-500">Member</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <RoleBadge role={member.role} />
      {effectiveRole === "member" && <span className="text-sm text-gray-500">Member</span>}
      <select
        value={effectiveRole}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "admin") onMakeAdmin();
          else if (v === "member") onRemoveAdmin();
        }}
        className="ml-1 rounded border border-gray-300 py-1 pl-2 pr-6 text-xs"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
    </div>
  );
}

const MemberCard = memo(function MemberCard({
  member,
  isOwner,
  currentUserId,
  selected,
  onToggleSelect,
  onOpenMenu,
  openMenu,
  onCloseMenu,
  onViewProfile,
  onMakeAdmin,
  onRemoveAdmin,
  onRemove,
}: {
  member: MemberWithLastActive;
  isOwner: boolean;
  currentUserId: string;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenMenu: () => void;
  openMenu: boolean;
  onCloseMenu: () => void;
  onViewProfile: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onRemove: () => void;
}) {
  const status = getActivityStatus(member.last_active);
  const statusColor =
    status === "active"
      ? "bg-green-100 text-green-800"
      : status === "at_risk"
        ? "bg-amber-100 text-amber-800"
        : "bg-gray-100 text-gray-600";

  return (
    <div
      className="relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#0072CE]/30 hover:shadow-md"
      onClick={onViewProfile}
    >
      <div className="absolute left-4 top-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="rounded border-gray-300"
        />
      </div>
      <div className="flex items-start gap-4 pl-8">
        <Avatar
          src={member.avatar_url}
          name={member.full_name}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{member.full_name ?? "—"}</p>
          <p className="text-sm text-gray-500">Grade {member.grade ?? "—"}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <RoleBadge role={member.role} />
            <span className="rounded-full bg-[#C8A415]/20 px-2 py-0.5 text-xs font-medium text-amber-800">
              {formatTierForDisplay(member.tier ?? "bronze")}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor}`}>
              {status === "active" ? "Active" : status === "at_risk" ? "At Risk" : "Inactive"}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-[#0072CE]">
            {member.engagement_score} pts
          </p>
          <p className="text-xs text-gray-500">
            {member.last_active
              ? `Last active ${formatDistanceToNow(new Date(member.last_active), { addSuffix: true })}`
              : "Never active"}
          </p>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onOpenMenu}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {openMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
              <MemberMenu
                member={member}
                isOwner={isOwner}
                currentUserId={currentUserId}
                onViewProfile={onViewProfile}
                onMakeAdmin={onMakeAdmin}
                onRemoveAdmin={onRemoveAdmin}
                onRemove={onRemove}
                onClose={onCloseMenu}
              />
            </>
          )}
        </div>
      </div>
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
    </div>
  );
});

function MemberMenu({
  member,
  isOwner,
  currentUserId,
  onViewProfile,
  onMakeAdmin,
  onRemoveAdmin,
  onRemove,
  onClose,
}: {
  member: MemberWithLastActive;
  isOwner: boolean;
  currentUserId: string;
  onViewProfile: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const isAdminRole = ["admin", "officer", "advisor"].includes(member.role);
  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
      <button
        type="button"
        onClick={() => {
          onViewProfile();
          onClose();
        }}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
      >
        <User className="h-4 w-4" />
        View Profile
      </button>
      {isOwner && !isAdminRole && member.role !== "owner" && (
        <button
          type="button"
          onClick={() => {
            onMakeAdmin();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
        >
          <Shield className="h-4 w-4" />
          Make Admin
        </button>
      )}
      {isOwner && isAdminRole && member.id !== currentUserId && (
        <button
          type="button"
          onClick={() => {
            onRemoveAdmin();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
        >
          <UserMinus className="h-4 w-4" />
          Remove Admin
        </button>
      )}
      {isOwner && member.id !== currentUserId && (
        <button
          type="button"
          onClick={() => {
            onRemove();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
          Remove from Chapter
        </button>
      )}
    </div>
  );
}

function MemberProfileDrawer({
  memberId,
  data,
  loading,
  onClose,
  isOwner,
  currentUserId,
  onMakeAdmin,
  onRemoveAdmin,
  onRemove,
}: {
  memberId: string;
  data: MemberProfileData | null;
  loading: boolean;
  onClose: () => void;
  isOwner: boolean;
  currentUserId: string;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onRemove: (id: string) => void;
}) {
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardPoints, setAwardPoints] = useState("");
  const [awardReason, setAwardReason] = useState("");

  const handleAward = async () => {
    const points = parseInt(awardPoints, 10);
    if (isNaN(points) || points <= 0) {
      toast.error("Enter valid points");
      return;
    }
    const result = await awardPointsToMember(memberId, points, awardReason);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Awarded ${points} points`);
      setAwardOpen(false);
      setAwardPoints("");
      setAwardReason("");
      onClose();
      window.location.reload();
    }
  };

  if (!data && !loading) return null;

  const drawerContent = (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          zIndex: 99998,
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 512,
          zIndex: 99999,
        }}
        className="flex flex-col overflow-y-auto border-0 sm:border-l border-gray-200 bg-white shadow-xl animate-slide-in-right"
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0072CE]/30 border-t-[#0072CE]" />
          </div>
        ) : data ? (
          <>
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Member Profile
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 p-6">
              <div className="flex items-center gap-4">
                <Avatar
                  src={data.profile.avatar_url}
                  name={data.profile.full_name}
                  size={64}
                />
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {data.profile.full_name ?? "—"}
                  </p>
                  <p className="text-sm text-gray-500">{data.profile.email}</p>
                  <div className="mt-2 flex gap-2">
                    <RoleBadge role={data.profile.role} />
                    <span className="rounded-full bg-[#C8A415]/20 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {formatTierForDisplay(data.profile.tier ?? "bronze")}
                    </span>
                  </div>
                </div>
              </div>

              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Grade</dt>
                  <dd className="text-gray-900">{data.profile.grade ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Experience</dt>
                  <dd className="text-gray-900 capitalize">
                    {data.profile.experience_level?.replace(/_/g, " ") ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Competition Events</dt>
                  <dd className="text-gray-900">
                    {Array.isArray(data.profile.interests) && data.profile.interests.length > 0
                      ? data.profile.interests.join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Joined</dt>
                  <dd className="text-gray-900">
                    {format(new Date(data.profile.created_at), "MMM d, yyyy")}
                  </dd>
                </div>
              </dl>

              {data.attendanceHistory.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-gray-900">
                    Attendance (Last 30 Days)
                  </h3>
                  <div className="flex h-24 items-end gap-1">
                    {data.attendanceHistory.map((d, i) => (
                      <div
                        key={d.date}
                        className="flex-1 rounded-t bg-[#0072CE]/20"
                        style={{
                          height: `${d.total > 0 ? (d.attended / d.total) * 100 : 0}%`,
                        }}
                        title={`${d.date}: ${d.attended}/${d.total}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>
                      {data.attendanceHistory[0]?.date.slice(5) ?? ""}
                    </span>
                    <span>
                      {data.attendanceHistory[data.attendanceHistory.length - 1]?.date.slice(5) ?? ""}
                    </span>
                  </div>
                </div>
              )}

              {data.pointsBreakdown.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-gray-900">
                    Points Breakdown
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.pointsBreakdown.map((p) => (
                      <span
                        key={p.label}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.label}: {p.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                <Link
                  href={`/admin/members/${memberId}`}
                  className="rounded-lg bg-[#0072CE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004B87]"
                >
                  Full Profile
                </Link>
                <button
                  type="button"
                  onClick={() => setAwardOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-[#C8A415] bg-[#C8A415]/10 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-[#C8A415]/20"
                >
                  <Gift className="h-4 w-4" />
                  Award Points
                </button>
                {isOwner && !["owner", "admin", "officer", "advisor"].includes(data.profile.role) && (
                  <button
                    type="button"
                    onClick={onMakeAdmin}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Make Admin
                  </button>
                )}
                {isOwner && ["admin", "officer", "advisor"].includes(data.profile.role) && memberId !== currentUserId && (
                  <button
                    type="button"
                    onClick={onRemoveAdmin}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Remove Admin
                  </button>
                )}
                {isOwner && memberId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Remove this member from the chapter?"))
                        onRemove(memberId);
                    }}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );

  const awardModalContent = awardOpen && data && (
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
        onClick={() => {
          setAwardOpen(false);
          setAwardPoints("");
          setAwardReason("");
        }}
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
          className="modal modal-content w-full max-w-md rounded-t-2xl sm:rounded-xl border border-gray-200 bg-white p-6 max-h-[90vh] overflow-y-auto animate-modal-enter"
          style={{ pointerEvents: "auto" }}
        >
            <h3 className="font-semibold text-gray-900">Award Points</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Points
                </label>
                <input
                  type="number"
                  min={1}
                  value={awardPoints}
                  onChange={(e) => setAwardPoints(e.target.value)}
                  className="modal-input mt-1 block w-full rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <input
                  type="text"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  className="modal-input mt-1 block w-full rounded-lg px-4 py-2"
                  placeholder="e.g. Outstanding presentation"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAwardOpen(false);
                  setAwardPoints("");
                  setAwardReason("");
                }}
                className="flex-1 min-h-[44px] rounded-lg border border-gray-300 py-2 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAward}
                className="flex-1 min-h-[44px] rounded-lg bg-[#0072CE] py-2 font-semibold text-white"
              >
                Award
              </button>
            </div>
          </div>
        </div>
      </>
  );

  if (typeof document === "undefined") return null;
  return (
    <>
      {createPortal(drawerContent, document.body)}
      {awardModalContent && createPortal(awardModalContent, document.body)}
    </>
  );
}
