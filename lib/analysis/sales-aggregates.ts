import { getSupabaseService } from "@/lib/supabase/service";

export type SalesWindow = 7 | 14 | 30 | 90 | "all-time";

export type TopSellingProduct = {
  barcode: string;
  title: string;
  unitsSold: number;
  revenue: number;
};

function windowStartIso(window: SalesWindow): string | null {
  if (window === "all-time") return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - window);
  return d.toISOString();
}

function matchColumn(barcode: string, sku?: string | null): { column: "barcode" | "sku"; value: string } {
  const bc = barcode.trim();
  if (bc) return { column: "barcode", value: bc };
  const s = sku?.trim();
  if (s) return { column: "sku", value: s };
  return { column: "barcode", value: bc };
}

async function sumQuantity(
  match: { column: "barcode" | "sku"; value: string },
  window: SalesWindow,
  storeId?: 1 | 2,
): Promise<number> {
  const supabase = getSupabaseService();
  if (!supabase || !match.value) return 0;

  let query = supabase.from("order_line_items").select("quantity").eq(match.column, match.value);
  const start = windowStartIso(window);
  if (start) query = query.gte("order_created_at", start);
  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
}

export async function getUnitsSoldForBarcode(
  barcode: string,
  window: SalesWindow,
  storeId?: 1 | 2,
  sku?: string | null,
): Promise<number> {
  const match = matchColumn(barcode, sku);
  return sumQuantity(match, window, storeId);
}

export async function getUnitsSoldByStore(
  barcode: string,
  window: SalesWindow,
  sku?: string | null,
): Promise<{ storeA: number; storeB: number }> {
  const [storeA, storeB] = await Promise.all([
    getUnitsSoldForBarcode(barcode, window, 1, sku),
    getUnitsSoldForBarcode(barcode, window, 2, sku),
  ]);
  return { storeA, storeB };
}

export async function getTopSellingProducts(
  window: SalesWindow,
  limit: number,
  storeId?: 1 | 2,
): Promise<TopSellingProduct[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];

  let query = supabase
    .from("order_line_items")
    .select("barcode, sku, title, quantity, price");

  const start = windowStartIso(window);
  if (start) query = query.gte("order_created_at", start);
  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error || !data?.length) return [];

  const byKey = new Map<string, TopSellingProduct>();

  for (const row of data) {
    const key = row.barcode?.trim() || row.sku?.trim();
    if (!key) continue;
    const existing = byKey.get(key) ?? {
      barcode: row.barcode?.trim() || row.sku?.trim() || key,
      title: row.title,
      unitsSold: 0,
      revenue: 0,
    };
    existing.unitsSold += row.quantity ?? 0;
    const price = row.price != null ? Number(row.price) : 0;
    existing.revenue += (row.quantity ?? 0) * (Number.isFinite(price) ? price : 0);
    byKey.set(key, existing);
  }

  return [...byKey.values()]
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getTotalUnitsSold(
  window: SalesWindow,
  storeId?: 1 | 2,
): Promise<number> {
  const supabase = getSupabaseService();
  if (!supabase) return 0;

  let query = supabase.from("order_line_items").select("quantity");
  const start = windowStartIso(window);
  if (start) query = query.gte("order_created_at", start);
  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
}

export async function getProductSalesRank(
  barcode: string,
  window: SalesWindow,
  limit: number,
  sku?: string | null,
): Promise<number | null> {
  const leaders = await getTopSellingProducts(window, limit);
  const match = matchColumn(barcode, sku);
  const idx = leaders.findIndex(
    (p) =>
      (match.column === "barcode" && p.barcode === match.value) ||
      (match.column === "sku" && p.barcode === match.value),
  );
  return idx === -1 ? null : idx + 1;
}
