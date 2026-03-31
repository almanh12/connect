import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { ContentGeneratorClient } from "./content-generator-client";

export const metadata: Metadata = {
  title: "Content Generator",
  description: "AI-powered content generation for your chapter.",
};

export default async function ContentPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Generator</h1>
        <p className="mt-1 text-gray-600">
          Generate social media captions, email templates, and recruitment messages for your chapter events.
        </p>
      </div>
      <ContentGeneratorClient />
    </div>
  );
}
