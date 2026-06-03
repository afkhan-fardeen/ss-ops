import { getCollectionWindow } from "@/lib/datetime/collection-window";

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

export function getBahrainTodayDateKey(now = new Date()): string {
  return getCollectionWindow(now).dateKey;
}

export function getBahrainYearMonth(now = new Date()): string {
  const { y, m } = bahrainYmd(now);
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export type ParseMonthResult =
  | { ok: true; month: string }
  | { ok: false; error: string };

/** Validates `YYYY-MM` and rejects future months (Bahrain calendar). */
export function parseCodListMonthParam(month?: string): ParseMonthResult {
  const raw = month?.trim();
  if (!raw) return { ok: false, error: "Month is required (YYYY-MM)." };
  if (!/^\d{4}-\d{2}$/.test(raw)) {
    return { ok: false, error: "Invalid month format (use YYYY-MM)." };
  }
  const [, mm] = raw.split("-");
  const mNum = Number(mm);
  if (mNum < 1 || mNum > 12) return { ok: false, error: "Invalid month." };
  if (raw > getBahrainYearMonth()) {
    return { ok: false, error: "Cannot export a future month." };
  }
  return { ok: true, month: raw };
}

/** All collection close `dateKey`s for a calendar month (Bahrain YYYY-MM-DD). */
export function getCollectionDateKeysForMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const keys: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    keys.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return keys;
}

/** Drop close dates after today (for current month export). */
export function filterDateKeysNotAfterToday(keys: string[], now = new Date()): string[] {
  const today = getBahrainTodayDateKey(now);
  return keys.filter((k) => k <= today);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: TZ });
}

export type MonthOption = {
  value: string;
  label: string;
  dayCount: number;
};

/** Last N calendar months (Bahrain), newest first; excludes future months. */
export function listMonthOptions(count = 24, now = new Date()): MonthOption[] {
  const current = getBahrainYearMonth(now);
  const [cy, cm] = current.split("-").map(Number);
  const out: MonthOption[] = [];

  for (let i = 0; i < count; i++) {
    let y = cy;
    let m = cm - i;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    const value = `${y}-${String(m).padStart(2, "0")}`;
    const keys = getCollectionDateKeysForMonth(value);
    const filtered =
      value === current ? filterDateKeysNotAfterToday(keys, now) : keys;
    out.push({
      value,
      label: monthLabel(value),
      dayCount: filtered.length,
    });
  }

  return out;
}

export function resolveMonthDateKeys(month: string, now = new Date()): string[] {
  const keys = getCollectionDateKeysForMonth(month);
  if (month === getBahrainYearMonth(now)) {
    return filterDateKeysNotAfterToday(keys, now);
  }
  return keys;
}
