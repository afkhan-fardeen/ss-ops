import { loadStockBalanceCatalog } from "./load-stock-balance-preview";
import { getUnitsSoldMap } from "@/lib/analysis/sales-aggregates";
import { recordStockAlertSnapshot } from "@/lib/supabase/stock-alert-snapshots";

const VELOCITY_WINDOW = 14;
const WARNING_DAYS_THRESHOLD = 7;
const CRITICAL_DAYS_THRESHOLD = 2;

export type StockAlertSeverity = "critical" | "warning";

export type StockAlertRow = {
  ubexId: string;
  productName: string;
  sku: string;
  barcode: string;
  ubexStock: number;
  unitsSold14d: number;
  velocityPerDay: number | null;
  /** null = no recent sales, so a runway estimate isn't meaningful. */
  daysRemaining: number | null;
  severity: StockAlertSeverity;
};

export type StockAlertsResult = {
  rows: StockAlertRow[];
  scannedCount: number;
  fetchedAt: string;
};

function classify(ubexStock: number, daysRemaining: number | null): StockAlertSeverity | null {
  if (ubexStock === 0) return "critical";
  if (daysRemaining === null) return null;
  if (daysRemaining <= CRITICAL_DAYS_THRESHOLD) return "critical";
  if (daysRemaining < WARNING_DAYS_THRESHOLD) return "warning";
  return null;
}

/**
 * Scans the full Ubex↔Shopify catalog (same join Stock Balance's mismatch
 * sweep uses) and flags products at risk of stocking out soon, based on
 * real sales velocity rather than a flat stock-count threshold.
 */
export async function loadStockAlerts(opts?: { capturedBy?: string | null }): Promise<StockAlertsResult> {
  const [catalog, salesByKey] = await Promise.all([
    loadStockBalanceCatalog(),
    getUnitsSoldMap(VELOCITY_WINDOW),
  ]);

  const sellable = catalog.rows.filter(
    (r) => r.status === "matched" || r.status === "store-b-not-listed",
  );

  const rows: StockAlertRow[] = [];
  for (const row of sellable) {
    const key = row.barcode?.trim() || row.sku?.trim();
    const unitsSold14d = key ? (salesByKey.get(key) ?? 0) : 0;
    const velocityPerDay = unitsSold14d > 0 ? unitsSold14d / VELOCITY_WINDOW : null;
    const daysRemaining = velocityPerDay ? row.ubexStock / velocityPerDay : null;
    const severity = classify(row.ubexStock, daysRemaining);
    if (!severity) continue;

    rows.push({
      ubexId: row.ubexId,
      productName: row.productName,
      sku: row.sku,
      barcode: row.barcode,
      ubexStock: row.ubexStock,
      unitsSold14d,
      velocityPerDay,
      daysRemaining,
      severity,
    });
  }

  rows.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    const ad = a.daysRemaining ?? -1; // stockouts (null-velocity, 0 stock) sort first within critical
    const bd = b.daysRemaining ?? -1;
    return ad - bd;
  });

  const criticalRows = rows.filter((r) => r.severity === "critical");
  void recordStockAlertSnapshot({
    criticalCount: criticalRows.length,
    warningCount: rows.length - criticalRows.length,
    criticalProducts: criticalRows.map((r) => ({ productName: r.productName, ubexStock: r.ubexStock })),
    capturedBy: opts?.capturedBy,
  });

  return { rows, scannedCount: sellable.length, fetchedAt: new Date().toISOString() };
}
