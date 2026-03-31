import { createClient } from "@supabase/supabase-js";

/**
 * Admin client with service role key — bypasses RLS.
 * Use ONLY for trusted server-side operations (e.g. account deletion).
 * Never expose this client to the client bundle.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local for admin operations."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
