/**
 * Module ids that used to exist separately and are now part of "stock" (Stock analysis, Ubex Inventory,
 * Stock Alerts). Users who were granted any of them keep access to the merged Stock module.
 * See supabase/migrations/020_merge_stock_modules.sql for the data migration.
 */
export const LEGACY_STOCK_MODULE_IDS = ["stockAnalysis", "ubexInventory", "stockAlerts"] as const;

export function grantsStock(allowed: readonly string[]): boolean {
  return allowed.includes("stock") || LEGACY_STOCK_MODULE_IDS.some((id) => allowed.includes(id));
}
