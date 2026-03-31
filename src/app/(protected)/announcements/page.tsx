import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnnouncementsWidget } from "../dashboard/announcements-widget";

export const metadata: Metadata = {
  title: "Announcements",
  description: "Chapter announcements and updates.",
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("chapter_id")
    .eq("id", user.id)
    .single();

  if (!profile?.chapter_id) redirect("/chapter-setup");

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("chapter_id", profile.chapter_id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="mt-1 text-gray-600">
          Updates and news from your chapter.
        </p>
      </div>
      <AnnouncementsWidget announcements={announcements ?? []} fullPage />
    </div>
  );
}
