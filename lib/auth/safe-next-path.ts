/** Default landing page after sign-in. */
export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

/** Legacy module entry URLs — treat as “home” and send users to the dashboard instead. */
const LEGACY_HOME_PATHS = new Set([
  "/",
  "/fulfillment",
  "/cod",
  "/cod-list",
  "/stock-balance",
  "/history",
]);

/**
 * Validates post-login redirect targets. Rejects external URLs and legacy module roots
 * so a stale `?next=/stock-balance` bookmark does not skip the home dashboard.
 */
export function getSafeNextPath(next: string | undefined | null): string {
  if (!next || typeof next !== "string") return DEFAULT_POST_LOGIN_PATH;
  // Only same-origin, absolute-path targets. Backslashes and control characters are rejected because
  // browsers/WHATWG URL treat "/\\evil.com" like "//evil.com" (open redirect).
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  let parsed: URL;
  try {
    parsed = new URL(next, "http://portal.invalid");
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }
  if (parsed.origin !== "http://portal.invalid") return DEFAULT_POST_LOGIN_PATH;
  if (LEGACY_HOME_PATHS.has(parsed.pathname)) return DEFAULT_POST_LOGIN_PATH;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
