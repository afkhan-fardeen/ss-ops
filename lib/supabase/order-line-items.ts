import type { ShopifyLineItem, ShopifyOrder } from "@/lib/shopify/types";
import { getSupabaseService } from "./service";

export type OrderLineItemRow = {
  store_id: 1 | 2;
  shopify_order_id: number;
  shopify_order_name: string;
  line_item_id: number;
  product_id: number | null;
  variant_id: number | null;
  sku: string | null;
  barcode: string | null;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: number | null;
  order_created_at: string;
};

function lineItemToRow(
  order: ShopifyOrder & { created_at?: string | null },
  line: ShopifyLineItem,
  storeId: 1 | 2,
): OrderLineItemRow | null {
  if (!order.created_at) return null;
  const priceRaw = line.price;
  const price =
    priceRaw != null && priceRaw !== "" ? Number.parseFloat(priceRaw) : null;

  return {
    store_id: storeId,
    shopify_order_id: order.id,
    shopify_order_name: order.name,
    line_item_id: line.id,
    product_id: line.product_id ?? null,
    variant_id: line.variant_id ?? null,
    sku: line.sku?.trim() || null,
    barcode: line.barcode?.trim() || null,
    title: line.title,
    variant_title: line.variant_title ?? null,
    quantity: line.quantity,
    price: Number.isFinite(price) ? price : null,
    order_created_at: order.created_at,
  };
}

export async function upsertOrderLineItems(
  order: ShopifyOrder & { created_at?: string | null },
  storeId: 1 | 2,
): Promise<void> {
  const lines = order.line_items;
  if (!lines?.length) return;

  const supabase = getSupabaseService();
  if (!supabase) return;

  const rows = lines
    .map((line) => lineItemToRow(order, line, storeId))
    .filter((row): row is OrderLineItemRow => row != null);

  if (rows.length === 0) return;

  const { error } = await supabase.from("order_line_items").upsert(rows, {
    onConflict: "store_id,shopify_order_id,line_item_id",
  });
  if (error) console.warn("[order-line-items] upsert failed:", error.message);
}

export async function upsertOrdersLineItems(
  orders: Array<ShopifyOrder & { created_at?: string | null }>,
  storeId: 1 | 2,
): Promise<void> {
  for (const order of orders) {
    await upsertOrderLineItems(order, storeId);
  }
}
