import { canAccessModule } from "@/lib/auth/can-access-module";
import { stockBalanceMaxItems } from "@/lib/ubex/inventory";

export const dynamic = "force-dynamic";

export default async function StockBalanceSettingsPage() {
  if (!(await canAccessModule("stock"))) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          Stock balance settings are only available to admins or users granted the Stock Balance module.
        </p>
      </div>
    );
  }

  const maxItems = stockBalanceMaxItems();
  const locationId = process.env.SHOPIFY_LOCATION_ID?.trim() || null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="rounded-card border border-line border-l-4 border-l-stock bg-white p-5 shadow-soft">
        <p className="text-[11px] font-medium uppercase tracking-wider text-stock/80">
          Stock balance
        </p>
        <h1 className="mt-1 text-xl font-medium text-ink">Settings</h1>
        <p className="mt-2 text-[13px] text-muted">
          Runtime options are configured in Vercel environment variables.
        </p>
      </header>

      <dl className="space-y-3 rounded-card border border-line bg-white p-5 text-[13px] shadow-soft">
        <div>
          <dt className="font-medium text-muted">Store A domain</dt>
          <dd className="mt-0.5 font-mono text-ink">
            {process.env.SHOPIFY_STORE_DOMAIN?.trim() || "unset"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-muted">Store B domain</dt>
          <dd className="mt-0.5 font-mono text-ink">
            {process.env.SHOPIFY_STORE2_DOMAIN?.trim() || "unset (Store B disabled)"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-muted">SHOPIFY_LOCATION_ID (Store A override)</dt>
          <dd className="mt-0.5 font-mono text-ink">{locationId ?? "unset (auto-detect)"}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted">STOCK_BALANCE_MAX_ITEMS</dt>
          <dd className="mt-0.5 font-mono text-ink">
            {maxItems === null
              ? "unset (unused for search-driven balance page)"
              : String(maxItems)}
          </dd>
          <p className="mt-1 text-[12px] text-muted">
            Balance page loads Ubex 10 items at a time (search / load more). This cap still
            limits bulk sync size when set.
          </p>
        </div>
        <div>
          <dt className="font-medium text-muted">UBEX_INVENTORY_PAGE_DELAY_MS</dt>
          <dd className="mt-0.5 font-mono text-ink">
            {process.env.UBEX_INVENTORY_PAGE_DELAY_MS?.trim() || "350 (default)"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
