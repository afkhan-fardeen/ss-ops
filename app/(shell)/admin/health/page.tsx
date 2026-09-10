import { AlertTriangle, CheckCircle2, XCircle, Circle } from "lucide-react";
import { isPortalAdmin } from "@/lib/auth/is-portal-admin";
import { DashboardHeader } from "@/components/dashboard/DashboardPage";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityStackedChart } from "@/components/dashboard/ActivityStackedChart";
import { CronStatus } from "@/components/sync/CronStatus";
import { RefreshHealthButton } from "@/components/admin/RefreshHealthButton";
import { STORE_LABELS } from "@/lib/stores/labels";
import {
  loadSystemHealth,
  type Connectivity,
  type HealthFailureRow,
  type ConfigCheck,
} from "@/lib/admin/load-system-health";

export const dynamic = "force-dynamic";

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ConnectivityPill({
  label,
  configured,
  ok,
  detail,
}: {
  label: string;
  configured: boolean;
  ok: boolean;
  detail?: string;
}) {
  if (!configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-[11px] font-medium text-muted">
        <Circle size={7} className="fill-line text-line" />
        {label} — not configured
      </span>
    );
  }
  if (ok) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-[#4CAF50]/20 bg-[rgba(76,175,80,0.08)] px-3 py-1 text-[11px] font-medium text-[#2E7D32]"
        title={detail}
      >
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4CAF50] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
        </span>
        {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[#C25151]/20 bg-[rgba(194,81,81,0.08)] px-3 py-1 text-[11px] font-medium text-[#C25151]"
      title={detail}
    >
      <AlertTriangle size={11} className="shrink-0" />
      {label} — error
    </span>
  );
}

function ConnectivityStrip({ connectivity }: { connectivity: Connectivity }) {
  const { store1, store2, ubex, supabaseConfigured } = connectivity;
  return (
    <section className="animate-fade-up rounded-card border border-line bg-white p-5 shadow-soft">
      <h2 className="text-sm font-medium text-ink">Connectivity</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ConnectivityPill
          label={STORE_LABELS[1]}
          configured={store1.configured}
          ok={store1.ok}
          detail={store1.error ?? store1.shopName}
        />
        {store2.configured && (
          <ConnectivityPill
            label={STORE_LABELS[2]}
            configured={store2.configured}
            ok={store2.ok}
            detail={store2.error ?? store2.shopName}
          />
        )}
        <ConnectivityPill label="Ubex" configured={ubex.configured} ok={ubex.ok} detail={ubex.error} />
        <ConnectivityPill label="Supabase" configured={supabaseConfigured} ok={supabaseConfigured} />
      </div>
    </section>
  );
}

function RecentFailures({ rows }: { rows: HealthFailureRow[] }) {
  return (
    <section className="animate-fade-up space-y-3">
      <h2 className="text-sm font-medium text-ink">Recent failures</h2>
      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-5 text-[13px] text-muted shadow-soft">
          No failures across fulfillment, stock restock, or COD email in recent history.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Detail</th>
                <th className="px-4 py-2.5 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-muted">{fmtAgo(row.at)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink">{row.source}</td>
                  <td className="px-4 py-2.5 font-mono text-ink">{row.detail}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-[#C25151]" title={row.error ?? undefined}>
                    {row.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ConfigChecklist({ checks }: { checks: ConfigCheck[] }) {
  return (
    <section className="animate-fade-up rounded-card border border-line bg-white p-5 shadow-soft">
      <h2 className="text-sm font-medium text-ink">Configuration</h2>
      <ul className="mt-3 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-[12.5px]">
            {c.ok ? (
              <CheckCircle2 size={14} className="shrink-0 text-[#4CAF50]" />
            ) : (
              <XCircle size={14} className="shrink-0 text-[#C25151]" />
            )}
            <span className="text-ink">{c.label}</span>
            {c.hint && <span className="text-muted">— {c.hint}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SystemHealthPage() {
  if (!(await isPortalAdmin())) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 shadow-soft">
        <h1 className="text-lg font-medium text-ink">Access denied</h1>
        <p className="mt-2 text-[13px] text-muted">
          System Health is only available to accounts with the admin role in Supabase.
        </p>
      </div>
    );
  }

  const health = await loadSystemHealth();

  const chartData = health.errorTrend.map((d) => ({
    label: d.label,
    success: d.success,
    error: d.error,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <DashboardHeader
          moduleLabel="Admin"
          title="System health"
          description="Live connectivity, recent failures, and job status across every integration."
        />
        <div className="pt-1">
          <RefreshHealthButton />
        </div>
      </div>

      <ConnectivityStrip connectivity={health.connectivity} />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Stuck fulfillment claims"
          value={String(health.stuckFulfillmentCount)}
          hint="Idempotency claims (last 7d) with no matching success"
        />
        <StatCard
          label="Stuck restock claims"
          value={String(health.stuckStockRestockCount)}
          hint="Idempotency claims (last 7d) with no matching success"
        />
      </div>

      <section className="animate-fade-up space-y-3">
        <h2 className="text-sm font-medium text-ink">Auto-fulfill job</h2>
        <CronStatus />
      </section>

      <ChartCard title="Error rate (14 days)" description="Combined fulfillment, stock restock, and COD email activity.">
        <ActivityStackedChart data={chartData} successFill="#2F9E7F" />
      </ChartCard>

      <RecentFailures rows={health.recentFailures} />

      <ConfigChecklist checks={health.configChecks} />
    </div>
  );
}
