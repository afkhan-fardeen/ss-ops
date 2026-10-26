import { unstable_noStore as noStore } from "next/cache";
import { canAccessModule } from "@/lib/auth/can-access-module";
import { ModuleAccessDenied } from "@/components/portal/ModuleAccessDenied";
import { getSupabaseService } from "@/lib/supabase/service";
import { RecipientGroup } from "@/components/settings/RecipientGroup";
import { getBahrainCalendarDay } from "@/lib/datetime/bahrain-time";
import {
  SettingRow,
  SettingsHeader,
  SettingsPage,
  SettingsSection,
} from "@/components/settings/Settings";
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
    <SettingsPage>
      <SettingsHeader
        module="Sales Report"
        title="Settings"
        description="Who receives the daily sales report. Each report covers the previous Bahrain calendar day and links to the interactive page with an Excel download."
      />

      <SettingsSection title="Email recipients" description="An empty list means no report email is sent.">
        <div className="p-4 sm:p-5">
          <RecipientGroup
            settingKey="sales_report_emails"
            initialRecipients={recipients}
            placeholder="finance@example.com"
            saveLabel="Save recipients"
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Send now" description="Email yesterday's report to the recipients above.">
        <SettingRow label={yesterday.label} hint="Uses the same email as the daily report.">
          <SendSalesReportButton dayKey={yesterday.dateKey} />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Delivery">
        <SettingRow label="Scheduled send" hint="Daily emails are paused; use Send now when you need one." state="off" stateLabel="Paused" />
        <SettingRow label="Email provider" state={process.env.RESEND_API_KEY?.trim() ? "ok" : "warn"} stateLabel={process.env.RESEND_API_KEY?.trim() ? "Resend configured" : "Not configured"} />
      </SettingsSection>
    </SettingsPage>
  );
}
