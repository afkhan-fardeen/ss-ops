import type { ShopifyLineItem, ShopifyOrder } from "@/lib/shopify/types";
import { getSupabaseService } from "./service";

type OrderLineItemRow = {
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

const UPSERT_CHUNK_SIZE = 500;
const UPSERT_CONCURRENCY = 4;

function ordersToRows(
  orders: Array<ShopifyOrder & { created_at?: string | null }>,
  storeId: 1 | 2,
): OrderLineItemRow[] {
  const rows: OrderLineItemRow[] = [];
  for (const order of orders) {
    for (const line of order.line_items ?? []) {
      const row = lineItemToRow(order, line, storeId);
      if (row) rows.push(row);
    }
  }
  return rows;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Runs `fn` over `items` with at most `limit` in flight at once. */
async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function upsertLineItemRows(rows: OrderLineItemRow[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = getSupabaseService();
  if (!supabase) return;

  await runWithConcurrency(chunk(rows, UPSERT_CHUNK_SIZE), UPSERT_CONCURRENCY, async (batch) => {
    const { error } = await supabase.from("order_line_items").upsert(batch, {
      onConflict: "store_id,shopify_order_id,line_item_id",
    });
    if (error) console.warn("[order-line-items] upsert failed:", error.message);
  });
}

export async function upsertOrderLineItems(
  order: ShopifyOrder & { created_at?: string | null },
  storeId: 1 | 2,
): Promise<void> {
  await upsertLineItemRows(ordersToRows([order], storeId));
}

/** Batched upsert of line items for many orders at once — avoids one round-trip per order. */
export async function upsertOrdersLineItems(
  orders: Array<ShopifyOrder & { created_at?: string | null }>,
  storeId: 1 | 2,
): Promise<void> {
  await upsertLineItemRows(ordersToRows(orders, storeId));
}
