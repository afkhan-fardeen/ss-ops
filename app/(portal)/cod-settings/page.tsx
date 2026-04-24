import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseService } from "@/lib/supabase/service";
import { RecipientGroup } from "@/components/cod-settings/RecipientGroup";
import { Mail, Bell, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const EMPTY: SettingsMap = { email_recipients: [], fulfillment_notify_emails: [], error_notify_emails: [] };

type SettingsMap = {
  email_recipients: string[];
  fulfillment_notify_emails: string[];
  error_notify_emails: string[];
};

async function loadSettings(): Promise<SettingsMap> {
  // Opt out of Next.js data cache so the Supabase fetch always hits the DB.
  noStore();

  const supabase = getSupabaseService();
  if (!supabase) {
    console.warn("[cod-settings] Supabase service client not configured");
    return EMPTY;
  }

  const { data, error } = await supabase
    .from("cod_settings")
    .select("key, value")
    .in("key", ["email_recipients", "fulfillment_notify_emails", "error_notify_emails"]);

  if (error) {
    console.error("[cod-settings] Failed to load settings:", error.message);
    return EMPTY;
  }

  const map: Record<string, string[]> = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) {
    map[row.key] = (row.value ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  }
  return {
    email_recipients: map["email_recipients"] ?? [],
    fulfillment_notify_emails: map["fulfillment_notify_emails"] ?? [],
    error_notify_emails: map["error_notify_emails"] ?? [],
  };
}

export default async function CODSettingsPage() {
  const settings = await loadSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-[#111111]">COD Settings</h1>
        <p className="mt-1 text-[13px] text-[#555555]">
          Manage email recipients for the COD list and auto-sync notifications.
        </p>
      </header>

      {/* ── COD list email recipients ──────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-[#999999]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
            COD List Email
          </h2>
        </div>
        <p className="text-[13px] text-[#555555]">
          These addresses receive the COD list Excel when you click <strong>Email Ubex</strong> on the COD page.
        </p>
        <RecipientGroup
          settingKey="email_recipients"
          initialRecipients={settings.email_recipients}
          placeholder="ubex-team@example.com"
          saveLabel="Save COD recipients"
        />
      </section>

      <hr className="border-[#EBEBEB]" />

      {/* ── Fulfillment notifications ──────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-[#999999]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
            Fulfillment Notifications
          </h2>
        </div>
        <p className="text-[13px] text-[#555555]">
          When the auto-sync cron successfully fulfills one or more orders in Shopify, an email
          is sent here with a summary of fulfilled orders and their tracking links.
        </p>
        <RecipientGroup
          settingKey="fulfillment_notify_emails"
          initialRecipients={settings.fulfillment_notify_emails}
          placeholder="ops@example.com"
          saveLabel="Save fulfillment recipients"
        />
      </section>

      <hr className="border-[#EBEBEB]" />

      {/* ── Error alerts ───────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-[#999999]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
            Error Alerts
          </h2>
        </div>
        <p className="text-[13px] text-[#555555]">
          If the auto-sync cron encounters errors (e.g. Shopify fulfillment failed), an alert
          email is sent here with the affected orders and error details.
        </p>
        <RecipientGroup
          settingKey="error_notify_emails"
          initialRecipients={settings.error_notify_emails}
          placeholder="admin@example.com"
          saveLabel="Save alert recipients"
        />
      </section>
    </div>
  );
}
