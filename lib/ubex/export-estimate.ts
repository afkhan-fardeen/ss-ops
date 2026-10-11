import { getSupabaseService } from "@/lib/supabase/service";

const ESTIMATE_KEY = "ubex_inventory_export_last_total";

/** Last known total item count from a completed export — used to estimate progress on the next run. */
export async function getUbexExportEstimate(): Promise<number | null> {
  try {
    const supabase = getSupabaseService();
    if (!supabase) return null;
    const { data } = await supabase
      .from("cod_settings")
      .select("value")
      .eq("key", ESTIMATE_KEY)
      .maybeSingle();
    const raw = (data as { value: string } | null)?.value;
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function saveUbexExportEstimate(totalItems: number): Promise<void> {
  try {
    const supabase = getSupabaseService();
    if (!supabase || totalItems <= 0) return;
    await supabase
      .from("cod_settings")
      .upsert(
        { key: ESTIMATE_KEY, value: String(totalItems), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
  } catch {
    // best-effort — a stale/missing estimate just means the next run's progress bar is less precise.
  }
}
