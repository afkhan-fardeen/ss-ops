import { getSupabaseService } from "./service";
import type { FxRateSnapshotRow } from "./types";

/** Today's UTC date as YYYY-MM-DD. */
function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function readTodayFxSnapshot(): Promise<FxRateSnapshotRow | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fx_rate_snapshot")
    .select("*")
    .eq("date", todayUtcDate())
    .maybeSingle();
  if (error || !data) return null;
  return data as FxRateSnapshotRow;
}

export async function readMostRecentFxSnapshot(): Promise<FxRateSnapshotRow | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fx_rate_snapshot")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as FxRateSnapshotRow;
}

export async function upsertTodayFxSnapshot(params: {
  rates: Record<string, number>;
  source: string;
  base?: string;
}): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase.from("fx_rate_snapshot").upsert({
    date: todayUtcDate(),
    base: params.base ?? "GBP",
    rates: params.rates,
    source: params.source,
  });
  if (error) console.warn("[fx-snapshot] upsert failed:", error.message);
}
