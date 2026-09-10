/**
 * Auto-fulfill cron schedule (UTC). Keep in sync with vercel.json:
 *   "schedule": "0 14 * * *"  →  17:00 Asia/Bahrain (5:00 PM)
 */
const AUTO_FULFILL_CRON_HOURS_UTC = [14] as const;

/** Milliseconds until the next scheduled auto-fulfill run. */
export function msToNextAutoFulfillRun(now = new Date()): number {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const d = now.getUTCDate();
  const nowMs = now.getTime();

  for (const h of AUTO_FULFILL_CRON_HOURS_UTC) {
    const slot = Date.UTC(y, mo, d, h, 0, 0, 0);
    if (slot > nowMs) return slot - nowMs;
  }

  const firstHour = AUTO_FULFILL_CRON_HOURS_UTC[0];
  const tomorrow = Date.UTC(y, mo, d + 1, firstHour, 0, 0, 0);
  return tomorrow - nowMs;
}
