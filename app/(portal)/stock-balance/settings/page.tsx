import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { stockBalanceMaxItems } from "@/lib/ubex/inventory";

export const dynamic = "force-dynamic";

export default async function StockBalanceSettingsPage() {
  if (!(await isPortalAdmin())) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <h1 className="text-lg font-semibold text-[#111111]">Access denied</h1>
        <p className="mt-2 text-[13px] text-[#555555]">Stock balance settings are admin-only.</p>
      </div>
    );
  }

  const maxItems = stockBalanceMaxItems();
  const locationId = process.env.SHOPIFY_LOCATION_ID?.trim() || null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="rounded-card border border-[#EBEBEB] border-l-4 border-l-emerald-500 bg-white p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/80">
          Stock balance
        </p>
        <h1 className="mt-1 text-xl font-semibold text-[#111111]">Settings</h1>
        <p className="mt-2 text-[13px] text-[#555555]">
          Runtime options are configured in Vercel environment variables.
        </p>
      </header>

      <dl className="space-y-3 rounded-card border border-[#EBEBEB] bg-white p-5 text-[13px] shadow-soft">
        <div>
          <dt className="font-medium text-[#999999]">STOCK_BALANCE_MAX_ITEMS</dt>
          <dd className="mt-0.5 font-mono text-[#111111]">
            {maxItems === null ? "unset (full catalog)" : String(maxItems)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[#999999]">SHOPIFY_LOCATION_ID</dt>
          <dd className="mt-0.5 font-mono text-[#111111]">{locationId ?? "unset (default location)"}</dd>
        </div>
        <div>
          <dt className="font-medium text-[#999999]">UBEX_INVENTORY_PAGE_DELAY_MS</dt>
          <dd className="mt-0.5 font-mono text-[#111111]">
            {process.env.UBEX_INVENTORY_PAGE_DELAY_MS?.trim() || "350 (default)"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
