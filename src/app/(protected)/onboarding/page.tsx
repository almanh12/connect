import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If already onboarded, redirect to dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_complete) {
    redirect("/dashboard");
  }

  const userName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    null;
  const userEmail = user.email ?? null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <OnboardingWizard
        initialName={userName}
        initialEmail={userEmail}
      />
    </div>
  );
}
