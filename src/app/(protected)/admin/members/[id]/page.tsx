import React from "react";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { formatTierForDisplay } from "@/lib/points";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
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

  const { data: member } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("chapter_id", profile?.chapter_id)
    .single();

  if (!member) redirect("/admin/members");

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.full_name ?? "Unknown"}
        description="Member profile and details"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Members", href: "/admin/members" },
          { label: member.full_name ?? "Member" },
        ]}
        backHref="/admin/members"
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="mt-4 space-y-2">
          <div>
            <dt className="text-sm text-gray-500">Email</dt>
            <dd className="text-gray-900">{member.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Grade</dt>
            <dd className="text-gray-900">{member.grade ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Role</dt>
            <dd className="text-gray-900">{member.role}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Engagement Score</dt>
            <dd className="text-gray-900">{member.engagement_score}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Tier</dt>
            <dd className="text-gray-900">{member.tier ? formatTierForDisplay(member.tier) : "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
