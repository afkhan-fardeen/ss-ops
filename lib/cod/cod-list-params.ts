/** Next.js may pass `string | string[]` for query keys. */
export type CodListSearchParamsInput = {
  date?: string | string[];
  dates?: string | string[];
};

export function normalizeQueryParam(
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
