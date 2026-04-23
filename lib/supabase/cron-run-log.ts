import { getSupabaseService } from "./service";

export type CronRunStatus = "running" | "success" | "error";

export type CronRunLog = {
  id: number;
  endpoint: string;
  dry_run: boolean;
  status: CronRunStatus;
  checked: number | null;
  fulfilled: number | null;
  skipped: number | null;
  errors: number | null;
  error_detail: string | null;
  started_at: string;
  completed_at: string | null;
};

/** Insert a new "running" row at cron start. Returns the row id for later update. */
export async function startCronRun(dryRun: boolean): Promise<number | null> {
  const supabase = getSupabaseService();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("cron_run_log")
    .insert({ status: "running", dry_run: dryRun })
    .select("id")
    .single();
  if (error || !data) {
    console.warn("[cron-run-log] start failed:", error?.message);
    return null;
  }
  return (data as { id: number }).id;
}

/** Update the row at cron end with final stats. */
export async function completeCronRun(
  id: number,
  result: {
    status: CronRunStatus;
    checked: number;
    fulfilled: number;
    skipped: number;
    errors: number;
    errorDetail?: string;
  },
): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  const { error } = await supabase
    .from("cron_run_log")
    .update({
      status: result.status,
      checked: result.checked,
      fulfilled: result.fulfilled,
      skipped: result.skipped,
      errors: result.errors,
      error_detail: result.errorDetail ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) console.warn("[cron-run-log] complete failed:", error.message);
}

/** Fetch the most recent cron run log rows (latest first). */
export async function getRecentCronRuns(limit = 10): Promise<CronRunLog[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cron_run_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as CronRunLog[];
}
