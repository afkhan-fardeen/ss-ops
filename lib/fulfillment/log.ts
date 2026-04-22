import { createHash } from "node:crypto";
import { getSupabaseService } from "@/lib/supabase/service";
import type { FulfillmentLogRow, FulfillmentLogStatus } from "@/lib/supabase/types";

export type FulfillmentLogInsert = {
  shopifyOrderId: number;
  shopifyOrderName: string;
  ubexTracking?: string | null;
  trackingUrl?: string | null;
  trackingCompany?: string | null;
  status: FulfillmentLogStatus;
  shopifyFulfillmentId?: number | null;
  error?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  createdBy?: string | null;
};

/** Today's UTC date in YYYY-MM-DD. Used inside the idempotency key so retries next day get a fresh attempt. */
export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Stable idempotency key for a single (order, tracking, day) triple. */
export function idempotencyKey(orderId: number, tracking: string, day = todayUtcDate()): string {
  return createHash("sha256").update(`${orderId}|${tracking}|${day}`).digest("hex");
}

/** Insert a fulfillment_log row. Never throws — logging must not break the real push. */
export async function logFulfillment(input: FulfillmentLogInsert): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase.from("fulfillment_log").insert({
    shopify_order_id: input.shopifyOrderId,
    shopify_order_name: input.shopifyOrderName,
    ubex_tracking: input.ubexTracking ?? null,
    tracking_url: input.trackingUrl ?? null,
    tracking_company: input.trackingCompany ?? null,
    status: input.status,
    shopify_fulfillment_id: input.shopifyFulfillmentId ?? null,
    error: input.error ?? null,
    request_payload: (input.requestPayload as never) ?? null,
    response_payload: (input.responsePayload as never) ?? null,
    created_by: input.createdBy ?? null,
  });
  if (error) console.warn("[fulfillment-log] insert failed:", error.message);
}

/** Reserve the idempotency key; returns true if we were the first writer. */
export async function claimIdempotency(params: {
  key: string;
  shopifyOrderId: number;
  createdBy?: string | null;
}): Promise<boolean> {
  const supabase = getSupabaseService();
  if (!supabase) return true; // No Supabase → degrade to "always allow".
  const { error, status } = await supabase.from("push_idempotency").insert({
    key: params.key,
    shopify_order_id: params.shopifyOrderId,
    created_by: params.createdBy ?? null,
  });
  if (!error) return true;
  // 23505 = unique_violation → we were not the first.
  // PostgREST surfaces this as status 409 or error.code "23505".
  const code = (error as { code?: string }).code ?? "";
  if (code === "23505" || status === 409) return false;
  console.warn("[idempotency] insert failed:", error.message);
  return true; // Fail-open so transient DB issues don't block fulfillments.
}

/** Release the idempotency key so a failed push can be retried the same day. */
export async function releaseIdempotency(key: string): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase.from("push_idempotency").delete().eq("key", key);
  if (error) console.warn("[idempotency] release failed:", error.message);
}

/** Most recent successful log row for this (order, tracking). Used to short-circuit duplicate pushes. */
export async function findLastSuccessForKey(
  shopifyOrderId: number,
  tracking: string,
): Promise<FulfillmentLogRow | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fulfillment_log")
    .select("*")
    .eq("shopify_order_id", shopifyOrderId)
    .eq("ubex_tracking", tracking)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as FulfillmentLogRow;
}

/** Latest log row for a given order (success or error). Used by the UI to show last-push status. */
export async function getLastLogForOrder(shopifyOrderId: number): Promise<FulfillmentLogRow | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fulfillment_log")
    .select("*")
    .eq("shopify_order_id", shopifyOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as FulfillmentLogRow;
}

/** Bulk-fetch the latest log row per order for a list of order ids. */
export async function getLastLogsForOrders(
  orderIds: number[],
): Promise<Map<number, FulfillmentLogRow>> {
  const out = new Map<number, FulfillmentLogRow>();
  const supabase = getSupabaseService();
  if (!supabase || orderIds.length === 0) return out;
  const { data, error } = await supabase
    .from("fulfillment_log")
    .select("*")
    .in("shopify_order_id", orderIds)
    .order("created_at", { ascending: false });
  if (error || !data) return out;
  for (const row of data as FulfillmentLogRow[]) {
    if (!out.has(row.shopify_order_id)) out.set(row.shopify_order_id, row);
  }
  return out;
}
