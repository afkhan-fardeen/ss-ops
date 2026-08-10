const hits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_HITS = 5;

/** Simple in-memory rate limit per IP for public subscription form. */
export function checkPublicSubmitRateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= MAX_HITS) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

export function isSubscriptionsPublicEnabled(): boolean {
  const v = process.env.SUBSCRIPTIONS_PUBLIC_ENABLED?.trim();
  return v !== "0" && v !== "false";
}
