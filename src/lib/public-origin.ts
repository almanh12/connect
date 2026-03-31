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
