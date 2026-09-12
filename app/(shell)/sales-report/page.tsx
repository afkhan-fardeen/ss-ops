import { unstable_noStore as noStore } from "next/cache";
import { BarChart3, Mail } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { getSupabaseService } from "@/lib/supabase/service";
import { RecipientGroup } from "@/components/cod-settings/RecipientGroup";
import { loadDailySalesReport, type StoreSalesSummary } from "@/lib/sales/daily-sales-report";
import { SendSalesReportButton } from "@/components/sales-report/SendSalesReportButton";

export const dynamic = "force-dynamic";

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

function StoreCard({ summary }: { summary: StoreSalesSummary }) {
  return (
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
  );
}

export default async function SalesReportPage() {
  if (!(await canAccessModule("salesReport"))) {
    return (
      <ModuleAccessDenied description="Sales Report is only available to admins or users granted the module." />
    );
  }

  const [yesterday, today, recipients] = await Promise.all([
    loadDailySalesReport(-1),
    loadDailySalesReport(0),
    loadRecipients(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="animate-fade-up flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-card bg-subscriptions-bg text-subscriptions">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-xl font-medium text-ink">Sales Report</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Daily order counts and sales totals for both stores.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">
            {yesterday.day.label} · closed day
          </h2>
          <SendSalesReportButton offsetDays={-1} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {yesterday.stores.map((s) => (
            <StoreCard key={s.store} summary={s} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">
          {today.day.label} · today so far
        </h2>
        <div className="grid gap-3 opacity-70 sm:grid-cols-2">
          {today.stores.map((s) => (
            <StoreCard key={s.store} summary={s} />
          ))}
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
          Sent automatically every morning for the previous day. Empty list means the scheduled
          report is skipped.
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
