import type { ShopifyOrder } from "@/lib/shopify/types";
import { getWindowForDateKey, type CollectionWindow } from "@/lib/datetime/collection-window";

/** Store-agnostic helpers shared by the Store 1 and Store 2 COD list loaders. */

export function windowsForKeys(keys: string[]): CollectionWindow[] {
  return keys.map((k) => getWindowForDateKey(k));
}

export function orderFallsInAnyWindow(
  createdAtIso: string | null | undefined,
  windows: CollectionWindow[],
): boolean {
  if (!createdAtIso) return false;
  const t = Date.parse(createdAtIso);
  if (Number.isNaN(t)) return false;
  return windows.some((w) => {
    const a = Date.parse(w.createdAtMinIso);
    const b = Date.parse(w.createdAtMaxIso);
    return t >= a && t < b;
  });
}

export function dedupeByOrderId(orders: ShopifyOrder[]): ShopifyOrder[] {
  const m = new Map<number, ShopifyOrder>();
  for (const o of orders) {
    m.set(o.id, o);
  }
  return [...m.values()];
}
