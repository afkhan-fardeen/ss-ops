import Link from "next/link";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { ModuleDashboardShell, ModuleQuickLinks } from "@/components/portal/ModuleDashboardShell";
import { loadStockRestockSummary } from "@/lib/stock/load-restock-history";

export const dynamic = "force-dynamic";

export default async function StockBalanceDashboardPage() {
  if (!(await isPortalAdmin())) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-[#EBEBEB] bg-white p-8 shadow-soft">
        <h1 className="text-lg font-semibold text-[#111111]">Access denied</h1>
        <p className="mt-2 text-[13px] text-[#555555]">Stock balance is admin-only.</p>
      </div>
    );
  }

  const summary = await loadStockRestockSummary();
  const lastLabel = summary.lastRestockAt
    ? new Date(summary.lastRestockAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <ModuleDashboardShell
      moduleId="stock"
      title="Stock balance dashboard"
      description="Refresh Ubex vs Shopify, fix mismatches, and review restock history."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-[#EBEBEB] bg-white p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
            Last successful restock
          </p>
          <p className="mt-1 text-[14px] font-medium text-[#111111]">{lastLabel}</p>
        </div>
        <div className="rounded-card border border-[#EBEBEB] bg-white p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
            Restocks (7 days)
          </p>
          <p className="mt-1 text-[14px] font-medium text-[#111111]">{summary.restocksLast7Days}</p>
        </div>
      </div>
      <ModuleQuickLinks
        moduleId="stock"
        links={[
          { label: "Balance", href: "/stock-balance/balance", description: "Compare and restock" },
          { label: "History", href: "/stock-balance/history", description: "Past restock actions" },
          { label: "Settings", href: "/stock-balance/settings", description: "Catalog limits" },
        ]}
      />
      <Link
        href="/stock-balance/balance"
        className="inline-flex rounded-card border border-emerald-600 bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
      >
        Open balance table
      </Link>
    </ModuleDashboardShell>
  );
}
