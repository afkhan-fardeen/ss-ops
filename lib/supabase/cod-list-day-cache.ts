import type { ShopifyOrder } from "@/lib/shopify/types";
import { getSupabaseService } from "./service";

const SCHEMA_VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;

export function codListShopifyCacheEnabled(): boolean {
  return process.env.COD_LIST_SHOPIFY_CACHE !== "0";
}

/**
 * Merged, dedup-ready list only if every key has a row fresh and schema matches.
 * Otherwise `null` (fall back to live Shopify fetch).
 */
export async function getCachedOrdersForDateKeys(dateKeys: string[]): Promise<ShopifyOrder[] | null> {
  if (!codListShopifyCacheEnabled() || dateKeys.length === 0) return null;
  const supabase = getSupabaseService();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("cod_list_day_cache")
    .select("date_key, orders_json, fetched_at, schema_version")
    .in("date_key", dateKeys);

  if (error) {
    console.warn("[cod-list-day-cache] read failed:", error.message);
    return null;
  }
  if (!data || data.length !== dateKeys.length) return null;

  const byKey = new Map(data.map((r) => [r.date_key, r] as const));
  const now = Date.now();
  for (const k of dateKeys) {
    const row = byKey.get(k);
    if (!row) return null;
    if (row.schema_version !== SCHEMA_VERSION) return null;
    if (now - new Date(row.fetched_at).getTime() > TTL_MS) return null;
    if (!Array.isArray(row.orders_json)) return null;
  }

  const out: ShopifyOrder[] = [];
  for (const k of dateKeys) {
    const row = byKey.get(k)!;
    for (const o of row.orders_json as unknown[]) {
      if (o && typeof o === "object") {
        out.push(o as ShopifyOrder);
      }
    }
  }
  return out;
}

/**
 * One upsert per past window with that window’s order slice.
 */
export async function upsertCodListDayCacheSlices(
  slices: { dateKey: string; orders: ShopifyOrder[] }[],
  fetchedAt: string,
): Promise<void> {
  if (!codListShopifyCacheEnabled() || slices.length === 0) return;
  const supabase = getSupabaseService();
  if (!supabase) return;

  const rows = slices.map((s) => ({
    date_key: s.dateKey,
    orders_json: s.orders,
    fetched_at: fetchedAt,
    schema_version: SCHEMA_VERSION,
  }));
  const { error } = await supabase.from("cod_list_day_cache").upsert(rows, { onConflict: "date_key" });
  if (error) console.warn("[cod-list-day-cache] upsert failed:", error.message);
}

export { SCHEMA_VERSION as COD_LIST_CACHE_SCHEMA_VERSION };
