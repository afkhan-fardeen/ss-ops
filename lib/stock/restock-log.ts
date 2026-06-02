import { createHash } from "node:crypto";
import { getSupabaseService } from "@/lib/supabase/service";

export type StockRestockLogStatus = "success" | "error" | "skipped";

export type StockRestockLogInsert = {
  ubexId: string;
  barcode: string;
  shopifyInventoryItemId: string;
  locationId: number;
  ubexQty: number;
  previousOnHand?: number | null;
  newOnHand?: number | null;
  committed?: number | null;
  status: StockRestockLogStatus;
  error?: string | null;
  createdBy?: string | null;
};

export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function restockIdempotencyKey(
  barcode: string,
  locationId: number,
  targetQty: number,
  day = todayUtcDate(),
): string {
  return createHash("sha256")
    .update(`${barcode.trim()}|${locationId}|${targetQty}|${day}`)
    .digest("hex");
}

export async function logStockRestock(input: StockRestockLogInsert): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase.from("stock_restock_log").insert({
    ubex_id: input.ubexId,
    barcode: input.barcode,
    shopify_inventory_item_id: input.shopifyInventoryItemId,
    location_id: input.locationId,
    ubex_qty: input.ubexQty,
    previous_on_hand: input.previousOnHand ?? null,
    new_on_hand: input.newOnHand ?? null,
    committed: input.committed ?? null,
    status: input.status,
    error: input.error ?? null,
    created_by: input.createdBy ?? null,
  });
  if (error) console.warn("[stock-restock-log] insert failed:", error.message);
}

export async function claimRestockIdempotency(params: {
  key: string;
  barcode: string;
  locationId: number;
  createdBy?: string | null;
}): Promise<boolean> {
  const supabase = getSupabaseService();
  if (!supabase) return true;
  const { error, status } = await supabase.from("stock_restock_idempotency").insert({
    key: params.key,
    barcode: params.barcode,
    location_id: params.locationId,
    created_by: params.createdBy ?? null,
  });
  if (!error) return true;
  const code = (error as { code?: string }).code ?? "";
  if (code === "23505" || status === 409) return false;
  console.warn("[stock-restock-idempotency] insert failed:", error.message);
  return true;
}

export async function releaseRestockIdempotency(key: string): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase.from("stock_restock_idempotency").delete().eq("key", key);
  if (error) console.warn("[stock-restock-idempotency] release failed:", error.message);
}
