function bahrainYmd(d: Date): { y: number; m: number; day: number } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bahrain",
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

/**
 * Collection window: yesterday 14:00 → today 14:00 in Bahrain (Asia/Bahrain).
 */
export function getCollectionWindow(now = new Date()): {
  label: string;
  createdAtMinIso: string;
  createdAtMaxIso: string;
} {
  const { y, m, day } = bahrainYmd(now);
  const today1400 = bahrainInstant(y, m, day, 14, 0);
  const prev = addDays(y, m, day, -1);
  const yesterday1400 = bahrainInstant(prev.y, prev.m, prev.d, 14, 0);

  const label = `${yesterday1400.toISOString()} → ${today1400.toISOString()} (Bahrain 14:00–14:00)`;

  return {
    label,
    createdAtMinIso: yesterday1400.toISOString(),
    createdAtMaxIso: today1400.toISOString(),
  };
}
