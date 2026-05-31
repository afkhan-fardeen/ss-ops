import { lastDigits } from "@/lib/ubex/normalize";
import { getSupabaseService } from "./service";
import type { UbexCacheRow } from "./types";

export type UbexCacheLast4Hit = {
  tracking: string;
  trackingUrl: string;
};

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

/**
 * For each last-4, return tracking only when exactly one ubex_cache row matches (no guessing).
 */
export async function getUniqueUbexCacheByLast4(
  last4s: string[],
): Promise<Map<string, UbexCacheLast4Hit>> {
  const supabase = getSupabaseService();
  const unique = [...new Set(last4s.map((l) => l.trim()).filter((l) => l.length === 4))];
  if (!supabase || unique.length === 0) return new Map();

  const out = new Map<string, UbexCacheLast4Hit>();
  const chunkSize = 100;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("ubex_cache")
      .select("tracking, tracking_url, last4, sender_barcode")
      .in("last4", slice);
    if (error) {
      console.warn("[ubex-cache] last4 read failed:", error.message);
      continue;
    }

    const byLast4 = new Map<string, UbexCacheLast4Hit[]>();
    for (const row of (data ?? []) as {
      tracking: string;
      tracking_url: string | null;
      last4: string | null;
      sender_barcode: string | null;
    }[]) {
      const tracking = row.tracking?.trim();
      if (!tracking) continue;
      const l4 =
        (row.last4 ?? lastDigits(row.sender_barcode ?? "", 4)).trim();
      if (l4.length !== 4) continue;
      let list = byLast4.get(l4);
      if (!list) {
        list = [];
        byLast4.set(l4, list);
      }
      list.push({
        tracking,
        trackingUrl: row.tracking_url?.trim() ?? "",
      });
    }

    for (const [l4, hits] of byLast4) {
      if (hits.length === 1) out.set(l4, hits[0]!);
    }
  }

  return out;
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
