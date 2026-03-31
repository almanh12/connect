"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
    >
      Sign Out
    </button>
  );
}
