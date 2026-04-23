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
