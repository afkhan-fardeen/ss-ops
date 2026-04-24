/** Bahrain is UTC+3 (Asia/Bahrain). Collection window: D-1 @ 14:00 → D @ 14:00 Bahrain time. */

const TZ = "Asia/Bahrain";

function bahrainYmd(d: Date): { y: number; m: number; day: number } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = f.formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m: m - 1, day };
}

/** Instant for Bahrain wall-clock y-m-d at h:min (Asia/Bahrain, GMT+3). */
function bahrainInstant(y: number, monthIndex: number, day: number, h: number, min = 0): Date {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mi = String(min).padStart(2, "0");
  return new Date(`${y}-${mm}-${dd}T${hh}:${mi}:00+03:00`);
}

function addDays(y: number, m: number, d: number, delta: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m, d) + delta * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

/** Short human label for a collection window close date, e.g. "Thu 24 Apr". */
function shortLabel(closeDate: Date): string {
  return closeDate.toLocaleDateString("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export type CollectionWindow = {
  /** Human-readable label, e.g. "Thu 24 Apr 2026" */
  label: string;
  /** YYYY-MM-DD in Bahrain time (closing date of the window) */
  dateKey: string;
  createdAtMinIso: string;
  createdAtMaxIso: string;
  isToday: boolean;
};

/**
 * Returns the collection window whose closing 14:00 is the NEXT 14:00 BH
 * that is >= now (i.e. today's window if before 14:00, or tomorrow's if after).
 * For historical windows, pass a Date in the past.
 *
 * The `closeDate` here is the date when the 14:00 cutoff occurs.
 */
function windowForCloseDate(closeDate: Date, isToday: boolean): CollectionWindow {
  const { y, m, day } = bahrainYmd(closeDate);
  const close1400 = bahrainInstant(y, m, day, 14, 0);
  const prev = addDays(y, m, day, -1);
  const open1400 = bahrainInstant(prev.y, prev.m, prev.d, 14, 0);

  const fullYear = closeDate.toLocaleDateString("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return {
    label: isToday ? `Today · ${fullYear}` : fullYear,
    dateKey,
    createdAtMinIso: open1400.toISOString(),
    createdAtMaxIso: close1400.toISOString(),
    isToday,
  };
}

/**
 * Current collection window (yesterday 14:00 → today 14:00 Bahrain).
 * If it is already past 14:00 today (Bahrain), the window has closed —
 * data will be stale until tomorrow 14:00 but we still return today's window.
 */
export function getCollectionWindow(now = new Date()): CollectionWindow {
  return windowForCloseDate(now, true);
}

/**
 * Returns the collection window for a specific YYYY-MM-DD string (Bahrain date).
 * Used by /cod-list?date=YYYY-MM-DD and the /cod-history page.
 */
export function getWindowForDateKey(dateKey: string): CollectionWindow {
  // Parse as Bahrain midnight then shift to that calendar date
  const [y, m, d] = dateKey.split("-").map(Number);
  const closeDate = bahrainInstant(y, m - 1, d, 14, 0);
  const todayKey = getCollectionWindow().dateKey;
  return windowForCloseDate(closeDate, dateKey === todayKey);
}

/**
 * Returns the last N collection windows (most recent first).
 * n = 14 → two weeks.
 */
export function getLastNWindows(n = 14, now = new Date()): CollectionWindow[] {
  const windows: CollectionWindow[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    windows.push(windowForCloseDate(d, i === 0));
  }
  return windows;
}

/** Compact label: "24 Apr" */
export function shortWindowLabel(w: CollectionWindow): string {
  return shortLabel(new Date(w.createdAtMaxIso));
}
