import Link from "next/link";
import { ListChecks, PackageCheck, Scale } from "lucide-react";
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
  const { cod, fulfillment, stock, combinedDaily } = summary;

  const cards = [
    {
      module: modules.find((m) => m.id === "cod")!,
      description: "Daily COD collection windows, rates, and email exports.",
      href: "/cod/list",
    },
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

  const lastCodLabel = cod.lastSentAt
    ? `${cod.lastOrderCount ?? 0} orders · ${new Date(cod.lastSentAt).toLocaleDateString()}`
    : "None yet";

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
        title="Home"
        description="Seissense Ops — overview and quick access to each module."
      />

      <DashboardKpiGrid>
        <StatCard label="COD emails (14d)" value={String(cod.emailsLast14Days)} hint={lastCodLabel} />
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
        <StatCard
          label="COD orders emailed (14d)"
          value={String(cod.ordersEmailedLast14Days)}
        />
      </DashboardKpiGrid>

      <ChartCard
        title="Portal activity (14 days)"
        description="COD orders emailed, fulfillment pushes, and stock restocks per day"
        className="lg:col-span-2"
      >
        <CombinedActivityChart data={combinedDaily} showStock={showAdmin} />
      </ChartCard>

      <div>
        <h2 className="text-[13px] font-semibold text-[#111111]">Modules</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ module, description, href }) => {
            const Icon =
              module.id === "cod"
                ? ListChecks
                : module.id === "fulfillment"
                  ? PackageCheck
                  : Scale;
            return (
              <Link
                key={module.id}
                href={href}
                className={[
                  "group animate-fade-up rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft transition hover:border-[#DDDDDD]",
                  "border-l-4",
                  module.id === "cod"
                    ? "border-l-blue-500"
                    : module.id === "fulfillment"
                      ? "border-l-[#E57373]"
                      : "border-l-emerald-500",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-card ${module.accent.activeBg}`}
                  >
                    <Icon size={20} className={module.accent.activeText} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-[15px] font-semibold ${module.accent.activeText}`}>
                      {module.label}
                    </h3>
                    <p className="mt-1 text-[12px] leading-snug text-[#555555]">{description}</p>
                  </div>
                </div>
                <p className="mt-4 text-[12px] font-medium text-[#111111] group-hover:underline">
                  Open module →
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/cod/list"
          className="rounded-card border border-blue-600 bg-blue-600 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
        >
          COD List
        </Link>
        <Link
          href="/fulfillment/list"
          className="rounded-card border border-[#C25151] bg-[#C25151] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
        >
          Fulfillment list
        </Link>
        {showAdmin ? (
          <Link
            href="/stock-balance/balance"
            className="rounded-card border border-emerald-600 bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90"
          >
            Stock balance
          </Link>
        ) : null}
      </div>
    </DashboardPage>
  );
}
