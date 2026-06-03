import { unstable_noStore as noStore } from "next/cache";
import { getSupabaseService } from "@/lib/supabase/service";
import { RecipientGroup } from "@/components/cod-settings/RecipientGroup";
import { Mail, Bell, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const EMPTY: SettingsMap = {
  email_recipients: [],
  fulfillment_notify_emails: [],
  error_notify_emails: [],
};

type SettingsMap = {
  email_recipients: string[];
  fulfillment_notify_emails: string[];
  error_notify_emails: string[];
};

async function loadSettings(): Promise<SettingsMap> {
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

export default async function CodSettingsPage() {
  const settings = await loadSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800/80">COD</p>
        <h1 className="mt-1 text-xl font-semibold text-[#111111]">COD Settings</h1>
        <p className="mt-1 text-[13px] text-[#555555]">
          Manage email recipients for the COD list and Seissense Ops Bot notifications.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-[#999999]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
            COD List Email
          </h2>
        </div>
        <p className="text-[13px] text-[#555555]">
          These addresses receive the COD list Excel when you click <strong>Email Ubex</strong> on
          the COD page.
        </p>
        <RecipientGroup
          settingKey="email_recipients"
          initialRecipients={settings.email_recipients}
          placeholder="ubex-team@example.com"
          saveLabel="Save COD recipients"
        />
      </section>

      <hr className="border-[#EBEBEB]" />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-[#999999]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
            Fulfillment Notifications
          </h2>
        </div>
        <p className="text-[13px] text-[#555555]">
          When Seissense Ops Bot successfully fulfills orders in Shopify, a summary email is sent
          here.
        </p>
        <RecipientGroup
          settingKey="fulfillment_notify_emails"
          initialRecipients={settings.fulfillment_notify_emails}
          placeholder="ops@example.com"
          saveLabel="Save fulfillment recipients"
        />
      </section>

      <hr className="border-[#EBEBEB]" />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-[#999999]" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#999999]">
            Error Alerts
          </h2>
        </div>
        <p className="text-[13px] text-[#555555]">
          If Seissense Ops Bot encounters errors, an alert email is sent here.
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
