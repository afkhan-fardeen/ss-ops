import { getSupabaseService } from "@/lib/supabase/service";
import type { CodEmailLogRow } from "@/components/cod/CodEmailHistoryTable";

export async function loadCodEmailHistory(): Promise<{
  rows: CodEmailLogRow[];
  error: string | null;
}> {
  const supabase = getSupabaseService();
  if (!supabase) return { rows: [], error: "Supabase not configured" };

  try {
    const { data, error } = await supabase
      .from("cod_email_log")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows: CodEmailLogRow[] = (data ?? []).map((row) => ({
      id: row.id as string,
      sentAt: row.sent_at as string,
      sentByEmail: (row.sent_by_email as string | null) ?? null,
      windowStart: row.window_start as string,
      windowEnd: row.window_end as string,
      recipients: row.recipients as string,
      orderCount: row.order_count as number,
      status: row.status as "success" | "error",
      error: (row.error as string | null) ?? null,
    }));

    return { rows, error: null };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : "Failed to load COD email history",
    };
  }
}
