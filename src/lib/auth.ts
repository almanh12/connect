"use client";

import { createClient } from "@/lib/supabase/client";

const SIGN_OUT_FLAG = "deca_intentional_signout";

export function setIntentionalSignOut() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SIGN_OUT_FLAG, "1");
  }
}

export function clearIntentionalSignOut() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SIGN_OUT_FLAG);
  }
}

export function wasIntentionalSignOut(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SIGN_OUT_FLAG) === "1";
}

export async function signOut(): Promise<void> {
  setIntentionalSignOut();
  const supabase = createClient();
  await supabase.auth.signOut();
}
