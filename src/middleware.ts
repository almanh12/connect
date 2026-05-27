import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { enforceApiRateLimit } from "@/lib/security/rate-limit";

const PUBLIC_PATHS = ["/", "/login"];
const AUTH_CALLBACK_PATH = "/auth/callback";

export async function middleware(request: NextRequest) {
  const { response: supabaseResponse, user, dashboardUserLacksChapter } =
    await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // Allow auth callback to complete without redirect
  if (pathname.startsWith(AUTH_CALLBACK_PATH)) {
    return supabaseResponse;
  }

  // API routes: IP + (optional) user rate limits before handlers (Upstash or in-memory fallback)
  if (pathname.startsWith("/api/")) {
    const rl = await enforceApiRateLimit(request, user?.id ?? null);
    if (!rl.ok) {
      const res = NextResponse.json(
        { error: rl.message, code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
      // Preserve session refresh cookies from Supabase middleware
      supabaseResponse.cookies.getAll().forEach((c) => {
        res.cookies.set(c.name, c.value);
      });
      return res;
    }
    return supabaseResponse;
  }

  // Public paths - allow access
  if (PUBLIC_PATHS.includes(pathname)) {
    // Redirect authenticated users away from login to dashboard
    if (user && pathname === "/login") {
      const redirectTo = request.nextUrl.searchParams.get("redirectTo");
      const target =
        redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
      const res = NextResponse.redirect(new URL(target, request.url));
      supabaseResponse.cookies.getAll().forEach((c) => {
        res.cookies.set(c.name, c.value);
      });
      return res;
    }
    return supabaseResponse;
  }

  // Protected routes - redirect unauthenticated users to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    const fullPath = pathname + (request.nextUrl.search ? request.nextUrl.search : "");
    loginUrl.searchParams.set("redirectTo", fullPath);
    const res = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      res.cookies.set(c.name, c.value);
    });
    return res;
  }

  // Avoid loading the dashboard RSC for users who still need chapter setup (prevents error/flash before client redirect)
  if (dashboardUserLacksChapter) {
    const res = NextResponse.redirect(new URL("/chapter-setup", request.url));
    supabaseResponse.cookies.getAll().forEach((c) => {
      res.cookies.set(c.name, c.value);
    });
    return res;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - Server action requests (have Next-Action header) — skip to avoid breaking RSC response
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ico)$).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
