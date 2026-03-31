import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchAnalyticsData } from "@/lib/analytics";
import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Chapter engagement analytics and insights.",
};

export default async function AnalyticsPage() {
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

  const data = await fetchAnalyticsData(supabase, profile.chapter_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Chapter engagement metrics, trends, and AI-powered insights.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0072CE] border-t-transparent" />
          </div>
        }
      >
        <AnalyticsClient data={data} />
      </Suspense>
    </div>
  );
}
