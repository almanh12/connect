import { createClient } from "@/lib/supabase/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirectTo") ?? "/dashboard";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const origin = getPublicOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
