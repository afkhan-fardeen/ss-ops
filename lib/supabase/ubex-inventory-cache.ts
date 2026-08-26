import { getSupabaseService } from "./service";
import type { UbexInventoryCacheRow } from "./types";

export type UbexInventoryCacheMeta = {
  count: number;
  refreshedAt: string | null;
};

const PAGE = 1000;

export async function getUbexInventoryCacheMeta(): Promise<UbexInventoryCacheMeta | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;

  const { count, error: countError } = await supabase
    .from("ubex_inventory_cache")
    .select("barcode", { count: "exact", head: true });
  if (countError) {
    throw new Error(`ubex_inventory_cache count: ${countError.message}`);
  }

  const { data, error } = await supabase
    .from("ubex_inventory_cache")
    .select("refreshed_at")
    .order("refreshed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`ubex_inventory_cache meta: ${error.message}`);
  }

  return {
    count: count ?? 0,
    refreshedAt: data?.refreshed_at ?? null,
  };
}

export async function readUbexInventoryCache(): Promise<Map<string, UbexInventoryCacheRow>> {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase is not configured — cannot read Ubex inventory cache.");
  }

  const out = new Map<string, UbexInventoryCacheRow>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("ubex_inventory_cache")
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) {
      throw new Error(`ubex_inventory_cache read: ${error.message}`);
    }
    const rows = (data ?? []) as UbexInventoryCacheRow[];
    for (const row of rows) {
      const bc = row.barcode?.trim();
      if (!bc) continue;
      out.set(bc, row);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return out;
}

export type UbexInventoryCacheInsert = {
  barcode: string;
  ubex_id: string;
  sku: string;
  name: string;
  size: string | null;
  color: string | null;
  stock: number;
};

export async function replaceUbexInventoryCache(
  items: UbexInventoryCacheInsert[],
): Promise<{ count: number; refreshedAt: string }> {
  const supabase = getSupabaseService();
  if (!supabase) {
    throw new Error("Supabase is not configured — cannot write Ubex inventory cache.");
  }

  const refreshedAt = new Date().toISOString();
  const { error: delError } = await supabase.from("ubex_inventory_cache").delete().neq("barcode", "");
  if (delError) {
    throw new Error(`ubex_inventory_cache clear: ${delError.message}`);
  }

  const chunkSize = 500;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize).map((item) => ({
      ...item,
      refreshed_at: refreshedAt,
    }));
    const { error } = await supabase.from("ubex_inventory_cache").insert(chunk);
    if (error) {
      throw new Error(`ubex_inventory_cache insert: ${error.message}`);
    }
  }

  return { count: items.length, refreshedAt };
}
