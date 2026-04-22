import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type FxCacheRow = {
  id: string;
  payload: Record<string, number>;
  fetched_at: string;
  source: string;
};

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function readFxCache(): Promise<FxCacheRow | null> {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fx_rates_cache")
    .select("id,payload,fetched_at,source")
    .eq("id", "latest")
    .maybeSingle();
  if (error || !data) return null;
  return data as FxCacheRow;
}

export async function writeFxCache(row: Omit<FxCacheRow, "id"> & { id?: string }): Promise<void> {
  const supabase = adminClient();
  if (!supabase) return;
  const { error } = await supabase.from("fx_rates_cache").upsert({
    id: "latest",
    payload: row.payload,
    fetched_at: row.fetched_at,
    source: row.source,
  });
  if (error) {
    console.warn("[fx-cache] upsert skipped:", error.message);
  }
}
