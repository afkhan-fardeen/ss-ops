import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { getSupabaseService } from "@/lib/supabase/service";
import { RecipientGroup } from "@/components/cod-settings/RecipientGroup";
import {
  loadDailySalesReport,
  loadSalesHistory,
  type StoreSalesSummary,
} from "@/lib/sales/daily-sales-report";
import {
  bahrainDateKeyForInstant,
  getBahrainCalendarDay,
  getBahrainCalendarDayForKey,
} from "@/lib/datetime/collection-window";
import { SendSalesReportButton } from "@/components/sales-report/SendSalesReportButton";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ActivityBarChart } from "@/components/dashboard/ActivityBarChart";

export const dynamic = "force-dynamic";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadRecipients(): Promise<string[]> {
  noStore();
  const supabase = getSupabaseService();
  if (!supabase) return [];
  const { data } = await supabase
    .from("cod_settings")
    .select("value")
    .eq("key", "sales_report_emails")
    .maybeSingle();
  const raw = (data as { value: string } | null)?.value ?? "";
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bahrain",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const day = getBahrainCalendarDayForKey(dateKey);
  const shifted = new Date(new Date(day.startIso).getTime() + deltaDays * 86_400_000);
  return bahrainDateKeyForInstant(shifted.toISOString());
}

function StoreDetail({ summary }: { summary: StoreSalesSummary }) {
  return (
    <div className="space-y-3">
      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <p className="text-[13px] font-medium text-ink">{summary.store}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted">Orders</p>
            <p className="mt-0.5 text-[17px] font-semibold text-ink">{summary.orderCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted">Units sold</p>
            <p className="mt-0.5 text-[17px] font-semibold text-ink">{summary.unitsSold}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted">Total sales</p>
            <p className="mt-0.5 text-[17px] font-semibold text-ink">
              {formatMoney(summary.totalSales, summary.currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted">Discounts</p>
            <p className="mt-0.5 text-[17px] font-semibold text-ink">
              {formatMoney(summary.totalDiscounts, summary.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <p className="text-[12px] font-medium text-ink">Top products</p>
        {summary.topProducts.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted">No line items this day.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {summary.topProducts.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                <span className="shrink-0 font-mono text-muted">{p.unitsSold}×</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-card border border-line bg-white shadow-soft">
        <p className="px-4 pt-4 text-[12px] font-medium text-ink">
          Orders <span className="text-muted">({summary.orders.length})</span>
        </p>
        {summary.orders.length === 0 ? (
          <p className="p-4 text-[12px] text-muted">No orders this day.</p>
        ) : (
          <div className="mt-2 max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wider text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.orders.map((o) => (
                  <tr key={o.orderName} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 font-mono text-ink">{o.orderName}</td>
                    <td className="px-4 py-2 font-mono text-muted">{formatTime(o.createdAt)}</td>
                    <td className="px-4 py-2 text-right font-medium text-ink">
                      {formatMoney(o.amount, summary.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ day?: string }> | { day?: string };
}) {
  if (!(await canAccessModule("salesReport"))) {
    return (
      <ModuleAccessDenied description="Sales Report is only available to admins or users granted the module." />
    );
  }

  const resolved = (await searchParams) ?? {};
  const requestedKey = resolved.day && DATE_KEY_RE.test(resolved.day) ? resolved.day : null;
  const day = requestedKey ? getBahrainCalendarDayForKey(requestedKey) : getBahrainCalendarDay(-1);
  const todayKey = getBahrainCalendarDay(0).dateKey;

  const [report, history, recipients] = await Promise.all([
    loadDailySalesReport(day),
    loadSalesHistory(14),
    loadRecipients(),
  ]);

  const prevKey = shiftDateKey(day.dateKey, -1);
  const nextKey = shiftDateKey(day.dateKey, 1);
  const canGoNext = nextKey <= todayKey;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="animate-fade-up flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-card bg-subscriptions-bg text-subscriptions">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-xl font-medium text-ink">Sales Report</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Daily order counts, breakdown, and sales history for both stores.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Link
              href={`/sales-report?day=${prevKey}`}
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Previous day"
            >
              <ChevronLeft size={15} />
            </Link>
            <h2 className="px-2 text-[13px] font-medium text-ink">{day.label}</h2>
            {canGoNext ? (
              <Link
                href={`/sales-report?day=${nextKey}`}
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:bg-canvas hover:text-ink"
                aria-label="Next day"
              >
                <ChevronRight size={15} />
              </Link>
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-line">
                <ChevronRight size={15} />
              </span>
            )}
          </div>
          <SendSalesReportButton dayKey={day.dateKey} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {report.stores.map((s) => (
            <StoreDetail key={s.store} summary={s} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">
          Last 14 days
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {history[0]?.stores.map((_, storeIdx) => {
            const storeName = history[0]!.stores[storeIdx]!.store;
            const data = history.map((h) => ({
              label: h.label,
              value: Math.round(h.stores[storeIdx]!.totalSales),
            }));
            return (
              <ChartCard key={storeName} title={storeName} description="Total sales per day">
                <ActivityBarChart data={data} fill="#6B4FA2" valueLabel="Sales" />
              </ChartCard>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-muted" />
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">
            Report recipients
          </h2>
        </div>
        <p className="text-[13px] text-muted">
          Sent automatically every morning for the previous day, with a link back to this page.
          Empty list means the scheduled report is skipped.
        </p>
        <RecipientGroup
          settingKey="sales_report_emails"
          initialRecipients={recipients}
          placeholder="finance@example.com"
          saveLabel="Save recipients"
        />
      </section>
    </div>
  );
}
