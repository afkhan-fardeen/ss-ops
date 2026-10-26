/** Bahrain calendar-day helpers (Asia/Bahrain, UTC+3). */

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

export type BahrainCalendarDay = {
  /** Human-readable label, e.g. "Thu 24 Apr 2026" */
  label: string;
  /** YYYY-MM-DD in Bahrain time */
  dateKey: string;
  startIso: string;
  endIso: string;
};

/**
 * A midnight-to-midnight Bahrain calendar day. `offsetDays` 0 = today, -1 = yesterday, etc.
 */
export function getBahrainCalendarDay(offsetDays = 0, now = new Date()): BahrainCalendarDay {
  const { y, m, day } = bahrainYmd(now);
  const shifted = addDays(y, m, day, offsetDays);
  const next = addDays(shifted.y, shifted.m, shifted.d, 1);
  const start = bahrainInstant(shifted.y, shifted.m, shifted.d, 0, 0);
  const end = bahrainInstant(next.y, next.m, next.d, 0, 0);
  const label = start.toLocaleDateString("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dateKey = `${shifted.y}-${String(shifted.m + 1).padStart(2, "0")}-${String(shifted.d).padStart(2, "0")}`;
  return { label, dateKey, startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Same as `getBahrainCalendarDay`, but for an explicit "YYYY-MM-DD" Bahrain date (e.g. from a URL param). */
export function getBahrainCalendarDayForKey(dateKey: string): BahrainCalendarDay {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = addDays(y, m - 1, d, 1);
  const start = bahrainInstant(y, m - 1, d, 0, 0);
  const end = bahrainInstant(next.y, next.m, next.d, 0, 0);
  const label = start.toLocaleDateString("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return { label, dateKey, startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Which Bahrain calendar day ("YYYY-MM-DD") a given instant falls on. */
export function bahrainDateKeyForInstant(iso: string): string {
  const { y, m, day } = bahrainYmd(new Date(iso));
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Compact label for a Bahrain calendar day: "12 Sep". */
export function shortBahrainDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return shortLabel(bahrainInstant(y, m - 1, d, 12, 0));
}
