import { lastDigits } from "@/lib/ubex/normalize";
import { resolveTrackingUrl } from "@/lib/ubex/tracking-url";
import { getOrderUbexLinksForOrderIds } from "@/lib/supabase/order-ubex-links";
import { getUniqueUbexCacheByLast4, type UbexCacheLast4Hit } from "@/lib/supabase/ubex-cache";
import { applyStoredUbexLinks, type RowWithUbexFields } from "./apply-stored-links";

export type RowWithOrderName = RowWithUbexFields & { orderName: string };

function applyUbexCacheByLast4<T extends RowWithOrderName>(
  rows: T[],
  cacheByLast4: Map<string, UbexCacheLast4Hit>,
): T[] {
  if (cacheByLast4.size === 0) return rows;

  return rows.map((row) => {
    if (row.ubexId.trim()) return row;
    const l4 = lastDigits(row.orderName, 4);
    if (!l4) return row;
    const hit = cacheByLast4.get(l4);
    if (!hit) return row;
    return {
      ...row,
      ubexId: hit.tracking,
      trackingUrl: resolveTrackingUrl(hit.tracking, hit.trackingUrl),
    };
  });
}

/**
 * After live Ubex lookup: fill missing tracking from order_ubex_links, then unique ubex_cache last-4 rows.
 * Never overwrites an existing ubexId on the row.
 */
export async function applyUbexRowFallbacks<T extends RowWithOrderName>(
  rows: T[],
  orderIds: number[],
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const storedLinks = await getOrderUbexLinksForOrderIds(orderIds).catch(
    () => new Map<number, string>(),
  );
  let out = applyStoredUbexLinks(rows, storedLinks);

  const missingLast4s = out
    .filter((r) => !r.ubexId.trim())
    .map((r) => lastDigits(r.orderName, 4))
    .filter((l4): l4 is string => Boolean(l4));

  if (missingLast4s.length === 0) return out;

  const cacheByLast4 = await getUniqueUbexCacheByLast4(missingLast4s).catch(
    () => new Map<string, UbexCacheLast4Hit>(),
  );
  out = applyUbexCacheByLast4(out, cacheByLast4);
  return out;
}
