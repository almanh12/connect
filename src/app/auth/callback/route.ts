import { createClient } from "@/lib/supabase/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = getSafeRedirectPath(searchParams.get("redirectTo"));
  const origin = getPublicOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let destination = redirectTo;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("chapter_id")
        .eq("id", user.id)
        .maybeSingle();

      const needsChapter = !profile?.chapter_id;
      const preserveJoin = redirectTo.startsWith("/join");
      if (needsChapter && !preserveJoin) {
        destination = "/chapter-setup";
      }
    }

    return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
