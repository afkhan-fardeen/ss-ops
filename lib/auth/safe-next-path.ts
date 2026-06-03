/** Default landing page after sign-in. */
export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

/** Legacy module entry URLs — treat as “home” and send users to the dashboard instead. */
const LEGACY_HOME_PATHS = new Set([
  "/",
  "/cod-list",
  "/fulfillment",
  "/stock-balance",
  "/history",
  "/cod-history",
  "/cod-settings",
]);

/**
 * Validates post-login redirect targets. Rejects external URLs and legacy module roots
 * so a stale `?next=/stock-balance` bookmark does not skip the home dashboard.
 */
export function getSafeNextPath(next: string | undefined | null): string {
  if (!next || typeof next !== "string") return DEFAULT_POST_LOGIN_PATH;
  const path = next.split("?")[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return DEFAULT_POST_LOGIN_PATH;
  if (LEGACY_HOME_PATHS.has(path)) return DEFAULT_POST_LOGIN_PATH;
  return next;
}
