export type DayBucket = {
  date: string;
  label: string;
};

export type DailyCount = DayBucket & { count: number };

export type DailyStatusSplit = DayBucket & {
  success: number;
  error: number;
};

export function lastNDays(n: number): DayBucket[] {
  const out: DayBucket[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    out.push({
      date,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  return out;
}

export function emptyDailyCounts(days: number): DailyCount[] {
  return lastNDays(days).map((b) => ({ ...b, count: 0 }));
}

export function emptyDailyStatus(days: number): DailyStatusSplit[] {
  return lastNDays(days).map((b) => ({ ...b, success: 0, error: 0 }));
}

export function bucketTimestamps(
  timestamps: string[],
  days: number,
): DailyCount[] {
  const buckets = emptyDailyCounts(days);
  const start = buckets[0]!.date;
  for (const ts of timestamps) {
    const date = ts.slice(0, 10);
    if (date < start) continue;
    const row = buckets.find((b) => b.date === date);
    if (row) row.count += 1;
  }
  return buckets;
}

export function bucketStatusRows(
  rows: { at: string; status: string }[],
  days: number,
): DailyStatusSplit[] {
  const buckets = emptyDailyStatus(days);
  const start = buckets[0]!.date;
  for (const row of rows) {
    const date = row.at.slice(0, 10);
    if (date < start) continue;
    const b = buckets.find((x) => x.date === date);
    if (!b) continue;
    if (row.status === "success") b.success += 1;
    else b.error += 1;
  }
  return buckets;
}
