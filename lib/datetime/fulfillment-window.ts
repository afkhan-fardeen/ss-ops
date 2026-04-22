/**
 * Fulfillment queue covers a broader window than the COD collection window.
 * Default: last N days (N from `FULFILLMENT_WINDOW_DAYS`, default 30), ending now.
 */
export function getFulfillmentWindow(now = new Date()): {
  label: string;
  createdAtMinIso: string;
  createdAtMaxIso: string;
  days: number;
} {
  const days = Math.max(1, Number.parseInt(process.env.FULFILLMENT_WINDOW_DAYS ?? "30", 10) || 30);
  const max = now;
  const min = new Date(now.getTime() - days * 86400000);
  return {
    label: `Last ${days} day${days === 1 ? "" : "s"}`,
    createdAtMinIso: min.toISOString(),
    createdAtMaxIso: max.toISOString(),
    days,
  };
}
