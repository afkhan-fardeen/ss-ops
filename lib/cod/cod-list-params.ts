/** Next.js may pass `string | string[]` for query keys. */
export type CodListSearchParamsInput = {
  date?: string | string[];
  dates?: string | string[];
};

const MAX_PICK = 14;

function normalizeQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

export function normalizeCodListSearchParams(
  params: CodListSearchParamsInput | undefined,
): { date?: string; dates?: string } {
  return {
    date: normalizeQueryParam(params?.date),
    dates: normalizeQueryParam(params?.dates),
  };
}

/** Supports sync searchParams (Next 14) and Promise (Next 15). */
export async function resolveCodListPageSearchParams(
  searchParams:
    | CodListSearchParamsInput
    | Promise<CodListSearchParamsInput | undefined>
    | undefined,
): Promise<{ date?: string; dates?: string }> {
  let raw: CodListSearchParamsInput | undefined;
  if (
    searchParams != null &&
    typeof (searchParams as Promise<unknown>).then === "function"
  ) {
    raw = await (searchParams as Promise<CodListSearchParamsInput | undefined>);
  } else {
    raw = searchParams as CodListSearchParamsInput | undefined;
  }
  return normalizeCodListSearchParams(raw);
}

/**
 * From URL: `dates` comma-separated, or `date` (legacy) single, or null → default to current window.
 */
export function parseCodListDateParam(params: CodListSearchParamsInput | undefined): {
  dateKeys: string[] | null;
  /** Non-null = invalid; caller shows error */
  error: string | null;
} {
  const normalized = normalizeCodListSearchParams(params);
  const dFromDates = normalized.dates;
  if (dFromDates) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of dFromDates.split(",")) {
      const d = p.trim();
      if (!d) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return { dateKeys: null, error: `Invalid date: ${d}` };
      }
      if (seen.has(d)) continue;
      seen.add(d);
      out.push(d);
    }
    if (out.length > MAX_PICK) {
      return { dateKeys: null, error: `Select at most ${MAX_PICK} days.` };
    }
    if (out.length > 0) {
      return { dateKeys: out, error: null };
    }
  }
  if (normalized.date) {
    const d = normalized.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { dateKeys: null, error: "Invalid ?date= format (use YYYY-MM-DD)." };
    return { dateKeys: [d], error: null };
  }
  if (dFromDates === "") {
    return { dateKeys: null, error: null };
  }
  return { dateKeys: null, error: null };
}
