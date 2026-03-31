import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { StrategiesClient } from "./strategies-client";
import { getStrategies, getChapterOfficers } from "./actions";

export const metadata: Metadata = {
  title: "Strategies",
  description: "AI-powered engagement strategies.",
};

export default async function StrategiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) redirect("/dashboard");

  const [strategies, officers] = await Promise.all([
    getStrategies(),
    getChapterOfficers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Engagement Strategies</h1>
        <p className="mt-1 text-[var(--gray-500)]">
          AI-powered strategies to improve chapter engagement. Specify your challenges, generate targeted strategies, and track progress.
        </p>
      </div>
      <StrategiesClient initialStrategies={strategies} officers={officers} />
    </div>
  );
}
