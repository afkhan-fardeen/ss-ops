import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { stockBalanceMaxItems } from "@/lib/ubex/inventory";
import { isStore2Configured } from "@/lib/store2/client";
import { STORE_LABELS } from "@/lib/stores/labels";
import {
  SettingRow,
  SettingsFootnote,
  SettingsHeader,
  SettingsPage,
  SettingsSection,
} from "@/components/settings/Settings";

export const dynamic = "force-dynamic";

function env(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export default async function StockBalanceSettingsPage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <ModuleAccessDenied description="Stock balance settings are only available to admins or users granted the Stock Balance module." />
    );
  }

  const maxItems = stockBalanceMaxItems();

  return (
    <SettingsPage>
      <SettingsHeader
        module="Stock balance"
        title="Settings"
        description="How Ubex stock is compared with Shopify and synced. These come from environment variables and are read-only here."
      />

      <SettingsSection title="Stores" description="Both stores draw from the same Ubex warehouse pool.">
        <SettingRow label={`Store A · ${STORE_LABELS[1]}`} value={env("SHOPIFY_STORE_DOMAIN") ?? "Not set"} state={env("SHOPIFY_STORE_DOMAIN") ? "ok" : "warn"} stateLabel={env("SHOPIFY_STORE_DOMAIN") ? "Connected" : "Missing"} />
        <SettingRow label={`Store B · ${STORE_LABELS[2]}`} value={env("SHOPIFY_STORE2_DOMAIN") ?? "Not set"} state={isStore2Configured() ? "ok" : "off"} stateLabel={isStore2Configured() ? "Connected" : "Disabled"} />
        <SettingRow label="Store A location" hint="Inventory location that gets updated." value={env("SHOPIFY_LOCATION_ID") ?? "Auto-detect"} state={env("SHOPIFY_LOCATION_ID") ? "ok" : "default"} stateLabel={env("SHOPIFY_LOCATION_ID") ? "Override" : "Default"} />
      </SettingsSection>

      <SettingsSection title="Ubex loading" description="Keeps the portal under Ubex's rate limits.">
        <SettingRow label="Request delay" hint="Pause between Ubex inventory pages." value={`${env("UBEX_INVENTORY_PAGE_DELAY_MS") ?? "350"} ms`} state={env("UBEX_INVENTORY_PAGE_DELAY_MS") ? "ok" : "default"} stateLabel={env("UBEX_INVENTORY_PAGE_DELAY_MS") ? "Set" : "Default"} />
        <SettingRow label="Parallel pages" hint="Keep low to avoid “Too Many Attempts”." value={env("UBEX_INVENTORY_PAGE_PARALLEL") ?? "1"} state={env("UBEX_INVENTORY_PAGE_PARALLEL") ? "ok" : "default"} stateLabel={env("UBEX_INVENTORY_PAGE_PARALLEL") ? "Set" : "Default"} />
        <SettingRow label="Catalog cache" hint="How long a full-catalog load is reused by Alerts, Errors and Overview. Restocks clear it." value={`${env("STOCK_CATALOG_CACHE_SECONDS") ?? "90"} s`} state={env("STOCK_CATALOG_CACHE_SECONDS") ? "ok" : "default"} stateLabel={env("STOCK_CATALOG_CACHE_SECONDS") ? "Set" : "Default"} />
        <SettingRow label="Bulk sync cap" hint="Maximum items in one bulk sync." value={maxItems === null ? "No limit" : String(maxItems)} mono={false} state={maxItems === null ? "default" : "ok"} stateLabel={maxItems === null ? "Default" : "Set"} />
      </SettingsSection>

      <SettingsFootnote>To change a value, update the environment variable in Vercel and redeploy.</SettingsFootnote>
    </SettingsPage>
  );
}
