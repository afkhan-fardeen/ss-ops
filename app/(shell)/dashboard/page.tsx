import { requireSession } from "@/lib/auth/require-session";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { getAstGreeting, getDisplayName } from "@/lib/dashboard/get-display-name";
import { loadLauncherStats, type LauncherStats } from "@/lib/dashboard/load-launcher-stats";
import { getVisiblePortalModules } from "@/lib/auth/get-visible-modules";
import {
  ModuleGrid,
  type OverviewModule,
  type OverviewSection,
} from "@/components/overview/ModuleGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { InstallAppCard } from "@/components/pwa/InstallAppCard";

export const dynamic = "force-dynamic";

type Domain = "orders" | "inventory" | "finance";

const MODULE_META: Record<string, { description: string; href: string; domain: Domain }> = {
  fulfillment: {
    description: "Match Ubex tracking and push fulfillments to Shopify.",
    href: "/fulfillment/list",
    domain: "orders",
  },
  awb: {
    description: "Look up an order number and preview the UBEX Airway Bill PDF.",
    href: "/awb",
    domain: "orders",
  },
  stock: {
    description: "Balance Ubex and Shopify stock, restock, browse inventory and catch low-stock alerts.",
    href: "/stock-balance/balance",
    domain: "inventory",
  },
  subscriptions: {
    description: "Review employee subscription requests and track active subscriptions.",
    href: "/subscriptions?status=pending",
    domain: "finance",
  },
  salesReport: {
    description: "Daily order counts and sales totals for both stores.",
    href: "/sales-report",
    domain: "finance",
  },
};

const DOMAIN_ORDER: Domain[] = ["orders", "inventory", "finance"];
const DOMAIN_LABEL: Record<Domain, string> = {
  orders: "Orders & Delivery",
  inventory: "Inventory",
  finance: "Finance",
};

export default async function OverviewPage() {
  const session = await requireSession();
  const showAdmin = await isPortalAdmin();
  const [name, stats] = await Promise.all([getDisplayName(session), loadLauncherStats()]);
  const modules = await getVisiblePortalModules(session, showAdmin);

  const statByModule: Partial<Record<string, LauncherStats[keyof LauncherStats]>> = {
    fulfillment: stats.fulfillment,
    stock: stats.stock,
    subscriptions: stats.subscriptions,
  };

  const byDomain: Record<Domain, OverviewModule[]> = { orders: [], inventory: [], finance: [] };
  for (const m of modules) {
    const meta = MODULE_META[m.id];
    if (!meta) continue;
    const Icon = m.icon;
    byDomain[meta.domain].push({
      id: m.id,
      label: m.label,
      description: meta.description,
      href: meta.href,
      icon: <Icon size={20} strokeWidth={1.8} />,
      stat: statByModule[m.id],
    });
  }

  const sections: OverviewSection[] = DOMAIN_ORDER.filter((d) => byDomain[d].length > 0).map(
    (d) => ({ id: d, label: DOMAIN_LABEL[d], modules: byDomain[d] }),
  );

  const kpis = [
    { label: "Unfulfilled orders", stat: stats.fulfillment },
    { label: "Stock mismatches", stat: stats.stock },
    { label: "Critical stock alerts", stat: stats.stockAlerts },
    { label: "Pending subscriptions", stat: stats.subscriptions },
  ].filter((k) => k.stat);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {name ? `${getAstGreeting()}, ${name}` : "Overview"}
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Here&apos;s what needs attention across Seissense operations.
        </p>
      </header>

      <InstallAppCard dismissible />

      {kpis.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <StatCard key={k.label} label={k.label} value={k.stat!.value} hint={k.stat!.label} />
          ))}
        </div>
      ) : null}

      <ModuleGrid sections={sections} />
    </div>
  );
}
