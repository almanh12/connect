/**
 * Canonical origin for shareable URLs (chapter invites, etc.).
 * Prefer `NEXT_PUBLIC_APP_URL` (e.g. `https://decaengage.com` in Vercel production/preview)
 * so links are not tied to `*.vercel.app` deployment URLs or `window.location`.
 * Falls back to `window.location.origin` in the browser when env is unset (local dev).
 */
export function getPublicAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

/**
 * Public site origin for server-side redirects (OAuth callback, etc.).
 * On Vercel, `request.url` can disagree with the browser URL; prefer forwarded
 * headers and explicit env so post-login redirects stay on production.
 */
export function getPublicOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    return `${forwardedProto}://${host}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return new URL(request.url).origin;
}
