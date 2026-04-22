import { getSupabaseService } from "./service";
import type { UbexCacheRow } from "./types";

/** Single shape covering what we hydrate into the in-memory Ubex lookup. */
export type UbexCacheEntry = {
  tracking: string;
  sender_barcode?: string | null;
  tracking_url?: string | null;
};

/** Load all persisted Ubex shipments. Returns [] when Supabase isn't configured. */
export async function readAllUbexCache(): Promise<UbexCacheRow[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];
  const { data, error } = await supabase.from("ubex_cache").select("*").limit(10000);
  if (error || !data) return [];
  return data as UbexCacheRow[];
}

/** Upsert a batch of Ubex shipments. Called after `buildUbexLookup` builds fresh state. */
export async function upsertUbexCache(entries: UbexCacheEntry[]): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase || entries.length === 0) return;
  const rows = entries.map((e) => ({
    tracking: e.tracking,
    sender_barcode: e.sender_barcode ?? null,
    tracking_url: e.tracking_url ?? null,
    refreshed_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("ubex_cache").upsert(rows, { onConflict: "tracking" });
  if (error) console.warn("[ubex-cache] upsert failed:", error.message);
}
