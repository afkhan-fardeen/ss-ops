import { parseCodListMonthParam, resolveMonthDateKeys } from "@/lib/cod/cod-list-month";
import { loadCodListDataForDateKeys } from "@/lib/cod/cod-list-data";
import type { LoadCodListDataResult } from "@/lib/cod/cod-list-data";

/** Monthly COD export — does not use day picker URL params or 14-day limit. */
export async function loadCodListByMonth(month: string): Promise<LoadCodListDataResult> {
  const parsed = parseCodListMonthParam(month);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const dateKeys = resolveMonthDateKeys(parsed.month);
  if (dateKeys.length === 0) {
    return { ok: false, error: "No collection days in this month." };
  }

  return loadCodListDataForDateKeys(dateKeys);
}
