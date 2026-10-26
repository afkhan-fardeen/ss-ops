import Link from "next/link";
import { getPortalModules } from "@/config/modules";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { CombinedActivityChart } from "@/components/dashboard/CombinedActivityChart";
import {
  DashboardHeader,
  DashboardKpiGrid,
  DashboardPage,
} from "@/components/dashboard/DashboardPage";
import { StatCard } from "@/components/dashboard/StatCard";
import type { PortalHomeSummary } from "@/lib/dashboard/load-portal-home-summary";

type Props = { showAdmin: boolean; summary: PortalHomeSummary };

export function HomeDashboard({ showAdmin, summary }: Props) {
  const modules = getPortalModules(showAdmin);
  const { fulfillment, stock, combinedDaily } = summary;

  const cards = [
    {
      module: modules.find((m) => m.id === "fulfillment")!,
      description: "Match Ubex tracking and push fulfillments to Shopify.",
      href: "/fulfillment/list",
    },
    ...(showAdmin
      ? [
          {
            module: modules.find((m) => m.id === "stock")!,
            description: "Compare Ubex inventory with Shopify and restock on hand.",
            href: "/stock-balance/balance",
          },
        ]
      : []),
  ];

  const lastRestockLabel = stock.lastRestockAt
    ? new Date(stock.lastRestockAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <DashboardPage moduleId="home">
      <DashboardHeader
        moduleId="home"
        title="Analytics"
        description="Portal-wide activity across Fulfillment and Stock — the numbers behind the modules."
      />

      <DashboardKpiGrid>
        <StatCard
          label="Fulfillments (7d)"
          value={String(fulfillment.pushesLast7Days)}
          hint={
            fulfillment.successRate14d != null
              ? `${fulfillment.successRate14d}% success (14d)`
              : undefined
          }
        />
        {showAdmin ? (
          <StatCard
            label="Stock restocks (7d)"
            value={String(stock.restocksLast7Days)}
            hint={lastRestockLabel}
          />
        ) : null}
      </DashboardKpiGrid>

      <ChartCard
        title="Portal activity (14 days)"
        description="Fulfillment pushes and stock restocks per day"
        className="lg:col-span-2"
      >
        <CombinedActivityChart data={combinedDaily} showStock={showAdmin} />
      </ChartCard>

      <div>
        <h2 className="font-sans text-body font-medium text-ink">Modules</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ module, description, href }) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                href={href}
                className={[
                  "group animate-fade-up rounded-card border border-line bg-white p-5 shadow-soft transition hover:border-line",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-card ${module.accent.activeBg}`}
                  >
                    <Icon size={20} className={module.accent.activeText} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-heading font-medium ${module.accent.activeText}`}>
                      {module.label}
                    </h3>
                    <p className="mt-1 text-body-sm leading-snug text-muted">{description}</p>
                  </div>
                </div>
                <p className="mt-4 text-body-sm font-medium text-ink group-hover:underline">
                  Open module →
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/fulfillment/list"
          className="rounded-card border border-primary bg-primary px-4 py-2 text-body font-medium text-white transition hover:opacity-90"
        >
          Fulfillment list
        </Link>
        {showAdmin ? (
          <Link
            href="/stock-balance/balance"
            className="rounded-card border border-primary bg-primary px-4 py-2 text-body font-medium text-white transition hover:opacity-90"
          >
            Stock balance
          </Link>
        ) : null}
      </div>
    </DashboardPage>
  );
}
