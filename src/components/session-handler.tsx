"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { wasIntentionalSignOut, clearIntentionalSignOut } from "@/lib/auth";

/**
 * Listens for auth state changes (e.g. session expired).
 * When user is signed out unexpectedly, redirect to login with toast.
 * Skips toast when user intentionally signed out.
 */
export function SessionHandler() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        const path = window.location.pathname;
        if (path.startsWith("/login") || path === "/") return;
        if (wasIntentionalSignOut()) {
          clearIntentionalSignOut();
          return;
        }
        toast.info("Your session has expired. Please sign in again.");
        router.replace("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
