import { requireSession } from "@/lib/auth/require-session";
import { getUbexToken } from "@/lib/ubex/client";
import { isStore2Configured } from "@/lib/store2/client";
import { STORE_LABELS } from "@/lib/stores/labels";
import {
  SettingRow,
  SettingsFootnote,
  SettingsHeader,
  SettingsPage,
  SettingsSection,
} from "@/components/settings/Settings";

export const dynamic = "force-dynamic";

function env(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export default async function FulfillmentSettingsPage() {
  await requireSession();

  const notify = (env("SHOPIFY_NOTIFY_CUSTOMER") ?? "true").toLowerCase() === "true";

  return (
    <SettingsPage>
      <SettingsHeader
        module="Fulfillment"
        title="Settings"
        description="How orders are matched to Ubex and pushed to Shopify. These come from environment variables and are read-only here."
      />

      <SettingsSection title="Shopify push" description="Applied every time you press Push.">
        <SettingRow label="Tracking company" hint="Carrier name shown on the Shopify fulfillment." value={env("SHOPIFY_TRACKING_COMPANY") ?? "Other"} state={env("SHOPIFY_TRACKING_COMPANY") ? "ok" : "default"} stateLabel={env("SHOPIFY_TRACKING_COMPANY") ? "Set" : "Default"} />
        <SettingRow label="Email customer" hint="Whether Shopify emails the customer the tracking link." value={notify ? "Yes" : "No"} mono={false} />
        <SettingRow label="Order window" hint="How many days of orders the queue scans." value={`${env("FULFILLMENT_WINDOW_DAYS") ?? "30"} days`} mono={false} state={env("FULFILLMENT_WINDOW_DAYS") ? "ok" : "default"} stateLabel={env("FULFILLMENT_WINDOW_DAYS") ? "Set" : "Default"} />
      </SettingsSection>

      <SettingsSection title="Ubex" description="Shipment lookup used to find each order's tracking number.">
        <SettingRow label="API token" hint="Required to match orders and fetch AWBs." state={getUbexToken() ? "ok" : "warn"} stateLabel={getUbexToken() ? "Configured" : "Missing"} />
        <SettingRow label="Delivered status" hint="Ubex status that counts as fulfilled (used by scheduled sync)." value={env("UBEX_FULFILLED_STATUS") ?? "Order Fulfilled"} state={env("UBEX_FULFILLED_STATUS") ? "ok" : "default"} stateLabel={env("UBEX_FULFILLED_STATUS") ? "Set" : "Default"} />
        <SettingRow label="Tracking link template" hint="Used when Ubex doesn't return a usable link." value={env("UBEX_TRACKING_URL_TEMPLATE") ?? "https://ubex.co/tracking/{id}"} state={env("UBEX_TRACKING_URL_TEMPLATE") ? "ok" : "default"} stateLabel={env("UBEX_TRACKING_URL_TEMPLATE") ? "Set" : "Default"} />
      </SettingsSection>

      <SettingsSection title="Stores">
        <SettingRow label={STORE_LABELS[1]} value={env("SHOPIFY_STORE_DOMAIN") ?? "Not set"} state={env("SHOPIFY_STORE_DOMAIN") ? "ok" : "warn"} stateLabel={env("SHOPIFY_STORE_DOMAIN") ? "Connected" : "Missing"} />
        <SettingRow label={STORE_LABELS[2]} value={env("SHOPIFY_STORE2_DOMAIN") ?? "Not set"} state={isStore2Configured() ? "ok" : "off"} stateLabel={isStore2Configured() ? "Connected" : "Disabled"} />
      </SettingsSection>

      <SettingsSection title="Scheduled sync" description="Automatic fulfillment from Ubex delivery status.">
        <SettingRow label="Schedule" hint="Orders are currently pushed manually with the Push buttons." state="off" stateLabel="Paused" />
      </SettingsSection>

      <SettingsFootnote>To change a value, update the environment variable in Vercel and redeploy.</SettingsFootnote>
    </SettingsPage>
  );
}
