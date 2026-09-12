import type { NextRequest } from "next/server";

/** Public base URL for building absolute links (emails, webhooks). Prefers PORTAL_PUBLIC_URL, falls back to the request's own origin. */
export function resolvePortalBaseUrl(req: NextRequest): string {
  const envUrl = process.env.PORTAL_PUBLIC_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return req.nextUrl.origin.replace(/\/$/, "");
}
