import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
  /** True when the request targets /dashboard and the signed-in user has no chapter (needs /chapter-setup). */
  dashboardUserLacksChapter: boolean;
}> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - triggers cookie update
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  let dashboardUserLacksChapter = false;
  if (user && isDashboardRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("chapter_id")
      .eq("id", user.id)
      .maybeSingle();
    dashboardUserLacksChapter = !profile?.chapter_id;
  }

  return { response: supabaseResponse, user, dashboardUserLacksChapter };
}
