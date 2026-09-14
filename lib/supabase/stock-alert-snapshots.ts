import { getSupabaseService } from "@/lib/supabase/service";

export async function recordStockAlertSnapshot(input: {
  criticalCount: number;
  warningCount: number;
  criticalProducts: { productName: string; ubexStock: number }[];
  capturedBy?: string | null;
}): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) return;
  try {
    await supabase.from("stock_alert_snapshots").insert({
      captured_by: input.capturedBy ?? null,
      critical_count: input.criticalCount,
      warning_count: input.warningCount,
      critical_products: input.criticalProducts.slice(0, 10),
    });
  } catch (e) {
    console.warn("[stock-alert-snapshot] insert threw:", e);
  }
}
