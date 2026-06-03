import { getSupabaseService } from "@/lib/supabase/service";

export type StockRestockLogRow = {
  id: string;
  ubexId: string;
  barcode: string;
  shopifyInventoryItemId: string;
  locationId: number;
  ubexQty: number;
  previousOnHand: number | null;
  newOnHand: number | null;
  committed: number | null;
  status: "success" | "error" | "skipped";
  error: string | null;
  createdBy: string | null;
  createdAt: string;
  userEmail: string | null;
};

const PAGE_SIZE = 200;

export async function loadStockRestockHistory(): Promise<{
  rows: StockRestockLogRow[];
  error: string | null;
}> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return { rows: [], error: "Supabase not configured" };
  }

  try {
    const { data, error: err } = await supabase
      .from("stock_restock_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (err) throw new Error(err.message);

    const logs = (data ?? []) as Array<{
      id: string;
      ubex_id: string;
      barcode: string;
      shopify_inventory_item_id: string;
      location_id: number;
      ubex_qty: number;
      previous_on_hand: number | null;
      new_on_hand: number | null;
      committed: number | null;
      status: string;
      error: string | null;
      created_by: string | null;
      created_at: string;
    }>;

    const userIds = Array.from(
      new Set(logs.map((l) => l.created_by).filter((x): x is string => Boolean(x))),
    );
    const emailById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,email")
        .in("id", userIds);
      for (const p of (profiles ?? []) as { id: string; email: string }[]) {
        emailById.set(p.id, p.email);
      }
    }

    const rows: StockRestockLogRow[] = logs.map((log) => ({
      id: log.id,
      ubexId: log.ubex_id,
      barcode: log.barcode,
      shopifyInventoryItemId: log.shopify_inventory_item_id,
      locationId: log.location_id,
      ubexQty: log.ubex_qty,
      previousOnHand: log.previous_on_hand,
      newOnHand: log.new_on_hand,
      committed: log.committed,
      status: log.status as StockRestockLogRow["status"],
      error: log.error,
      createdBy: log.created_by,
      createdAt: log.created_at,
      userEmail: log.created_by ? emailById.get(log.created_by) ?? null : null,
    }));

    return { rows, error: null };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : "Failed to load stock restock history",
    };
  }
}

export async function loadStockRestockSummary(): Promise<{
  lastRestockAt: string | null;
  restocksLast7Days: number;
  error: string | null;
}> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return { lastRestockAt: null, restocksLast7Days: 0, error: "Supabase not configured" };
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: latest } = await supabase
      .from("stock_restock_log")
      .select("created_at")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count, error: countErr } = await supabase
      .from("stock_restock_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "success")
      .gte("created_at", sevenDaysAgo);
    if (countErr) throw new Error(countErr.message);

    return {
      lastRestockAt: latest?.created_at ?? null,
      restocksLast7Days: count ?? 0,
      error: null,
    };
  } catch (e) {
    return {
      lastRestockAt: null,
      restocksLast7Days: 0,
      error: e instanceof Error ? e.message : "Failed to load summary",
    };
  }
}
