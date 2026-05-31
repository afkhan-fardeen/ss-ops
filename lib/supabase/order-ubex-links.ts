import { getSupabaseService } from "./service";

export type OrderUbexLink = {
  shopify_order_id: number;
  shopify_order_name: string;
  ubex_tracking: string;
  last_ubex_status: string | null;
  auto_fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderUbexLinkInput = {
  shopifyOrderId: number;
  shopifyOrderName: string;
  ubexTracking: string;
};

/**
 * Upsert order→tracking matches. Called by the portal pages whenever the Ubex lookup
 * resolves a match. Only updates shopify_order_name, ubex_tracking, and updated_at —
 * never overwrites auto_fulfilled_at once it's set.
 */
export async function upsertOrderUbexLinks(entries: OrderUbexLinkInput[]): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase || entries.length === 0) return;
  const rows = entries.map((e) => ({
    shopify_order_id: e.shopifyOrderId,
    shopify_order_name: e.shopifyOrderName,
    ubex_tracking: e.ubexTracking,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("order_ubex_links")
    .upsert(rows, { onConflict: "shopify_order_id" });
  if (error) console.warn("[order-ubex-links] upsert failed:", error.message);
}

/**
 * Load persisted Ubex tracking ids for a set of Shopify order ids (portal display fallback).
 */
export async function getOrderUbexLinksForOrderIds(
  orderIds: number[],
): Promise<Map<number, string>> {
  const supabase = getSupabaseService();
  if (!supabase || orderIds.length === 0) return new Map();

  const unique = [...new Set(orderIds)];
  const out = new Map<number, string>();

  // Supabase .in() is fine for typical window sizes; chunk for very large sets.
  const chunkSize = 200;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("order_ubex_links")
      .select("shopify_order_id, ubex_tracking")
      .in("shopify_order_id", slice);
    if (error) {
      console.warn("[order-ubex-links] batch read failed:", error.message);
      continue;
    }
    for (const row of (data ?? []) as { shopify_order_id: number; ubex_tracking: string }[]) {
      const tracking = row.ubex_tracking?.trim();
      if (tracking) out.set(row.shopify_order_id, tracking);
    }
  }

  return out;
}

/**
 * Return all pending (not yet auto-fulfilled) links, oldest first.
 * Capped at 100 rows per cron run to stay within Ubex API rate limits.
 */
export async function getPendingOrderUbexLinks(): Promise<OrderUbexLink[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("order_ubex_links")
    .select("*")
    .is("auto_fulfilled_at", null)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error || !data) return [];
  return data as OrderUbexLink[];
}

/** Mark an order as auto-fulfilled (called after a successful Shopify push). */
export async function markOrderAutoFulfilled(
  shopifyOrderId: number,
  ubexStatus: string,
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase
    .from("order_ubex_links")
    .update({
      last_ubex_status: ubexStatus,
      auto_fulfilled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("shopify_order_id", shopifyOrderId);
  if (error) console.warn("[order-ubex-links] markFulfilled failed:", error.message);
}

/** Update last_ubex_status without marking fulfilled (order is still in-transit). */
export async function updateUbexStatus(
  shopifyOrderId: number,
  ubexStatus: string,
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase
    .from("order_ubex_links")
    .update({
      last_ubex_status: ubexStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("shopify_order_id", shopifyOrderId);
  if (error) console.warn("[order-ubex-links] updateStatus failed:", error.message);
}
