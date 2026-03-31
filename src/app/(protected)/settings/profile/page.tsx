import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "./profile-settings-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Profile Settings",
  description: "Edit your profile and account settings.",
};

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, grade, experience_level, interests, avatar_url, engagement_score, tier, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile Settings"
        description="Update your profile information and competition events."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Profile" },
        ]}
        backHref="/settings"
      />
      <ProfileSettingsForm
        initialData={{
          full_name: profile?.full_name ?? "",
          grade: profile?.grade ?? null,
          experience_level: profile?.experience_level ?? null,
          interests: (profile?.interests as string[] | null) ?? [],
          avatar_url: profile?.avatar_url ?? null,
          engagement_score: profile?.engagement_score ?? 0,
          tier: (profile?.tier ?? "bronze").toLowerCase(),
          role: profile?.role ?? "member",
        }}
      />
    </div>
  );
}
