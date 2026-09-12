import { unstable_noStore as noStore } from "next/cache";
import { Mail } from "lucide-react";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { getSupabaseService } from "@/lib/supabase/service";
import { RecipientGroup } from "@/components/cod-settings/RecipientGroup";
import { getBahrainCalendarDay } from "@/lib/datetime/collection-window";
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

export default async function SalesReportSettingsPage() {
  if (!(await canAccessModule("salesReport"))) {
    return (
      <ModuleAccessDenied description="Sales Report is only available to admins or users granted the module." />
    );
  }

  const [recipients, yesterday] = await Promise.all([
    loadRecipients(),
    Promise.resolve(getBahrainCalendarDay(-1)),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-wider text-subscriptions">
          Sales Report
        </p>
        <h1 className="mt-1 text-xl font-medium text-ink">Recipients</h1>
        <p className="mt-1 text-[13px] text-muted">
          Sent automatically every morning for the previous day, with a link to the interactive
          report and an Excel download. Empty list means the scheduled email is skipped.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-muted" />
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">
            Email recipients
          </h2>
        </div>
        <RecipientGroup
          settingKey="sales_report_emails"
          initialRecipients={recipients}
          placeholder="finance@example.com"
          saveLabel="Save recipients"
        />
      </section>

      <section className="flex items-center justify-between rounded-card border border-line bg-white p-4 shadow-soft">
        <div>
          <p className="text-[13px] font-medium text-ink">Send a test email now</p>
          <p className="mt-0.5 text-[12px] text-muted">
            Sends yesterday&apos;s report ({yesterday.label}) to the recipients above.
          </p>
        </div>
        <SendSalesReportButton dayKey={yesterday.dateKey} />
      </section>
    </div>
  );
}
