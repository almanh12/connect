/** Default path after sign-in when no valid redirect is provided. */
export const DEFAULT_POST_AUTH_PATH = "/dashboard";

/**
 * Sanitize an in-app redirect path. Rejects empty, `/`, and protocol-relative URLs.
 */
export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_AUTH_PATH
): string {
  const path = raw?.trim() ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path === "/") {
    return fallback;
  }
  return path;
}
