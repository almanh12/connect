import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { MembersClient } from "./members-client";

export const metadata: Metadata = {
  title: "Members",
  description: "Manage chapter members, roles, and permissions.",
};

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    redirect("/dashboard");
  }

  if (!profile?.chapter_id) redirect("/chapter-setup");

  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("chapter_id", profile.chapter_id)
    .order("engagement_score", { ascending: false });

  const memberIds = (members ?? []).map((m) => m.id);
  const [attRes, epRes, mpRes] = await Promise.all([
    memberIds.length > 0
      ? supabase
          .from("attendance")
          .select("user_id, checked_in_at")
          .in("user_id", memberIds)
          .not("checked_in_at", "is", null)
      : { data: [] },
    memberIds.length > 0
      ? supabase
          .from("engagement_points")
          .select("user_id, created_at")
          .in("user_id", memberIds)
      : { data: [] },
    memberIds.length > 0
      ? supabase
          .from("manual_points")
          .select("user_id, created_at")
          .in("user_id", memberIds)
      : { data: [] },
  ]);

  const lastActiveMap = new Map<string, string>();
  for (const r of attRes.data ?? []) {
    const t = r.checked_in_at ?? "";
    if (t && (!lastActiveMap.has(r.user_id) || t > (lastActiveMap.get(r.user_id) ?? "")))
      lastActiveMap.set(r.user_id, t);
  }
  for (const r of epRes.data ?? []) {
    const t = r.created_at ?? "";
    if (t && (!lastActiveMap.has(r.user_id) || t > (lastActiveMap.get(r.user_id) ?? "")))
      lastActiveMap.set(r.user_id, t);
  }
  for (const r of mpRes.data ?? []) {
    const t = r.created_at ?? "";
    if (t && (!lastActiveMap.has(r.user_id) || t > (lastActiveMap.get(r.user_id) ?? "")))
      lastActiveMap.set(r.user_id, t);
  }

  const membersWithLastActive = (members ?? []).map((m) => ({
    ...m,
    last_active: lastActiveMap.get(m.id) ?? null,
  }));

  return (
    <MembersClient
      members={membersWithLastActive}
      currentUserId={user.id}
      isOwner={profile.role === "owner"}
    />
  );
}
