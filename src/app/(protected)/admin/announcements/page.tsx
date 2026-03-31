import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { AnnouncementsClient } from "./announcements-client";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Post and manage chapter announcements.",
};

export default async function AnnouncementsPage() {
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

  if (!isAdminRole(profile?.role)) redirect("/dashboard");
  if (!profile?.chapter_id) redirect("/chapter-setup");

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("chapter_id", profile.chapter_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="mt-1 text-gray-600">
          Create and manage chapter announcements.
        </p>
      </div>
      <AnnouncementsClient announcements={announcements ?? []} />
    </div>
  );
}
