export const dynamic = "force-dynamic";

export default function FulfillmentSettingsPage() {
  const trackingCompany = process.env.SHOPIFY_TRACKING_COMPANY?.trim() || "Other (default)";
  const notifyCustomer =
    (process.env.SHOPIFY_NOTIFY_CUSTOMER ?? "true").toLowerCase() === "true" ? "true" : "false";
  const fulfilledStatus = process.env.UBEX_FULFILLED_STATUS?.trim() || "Order Fulfilled (default)";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="rounded-card border border-line border-l-4 border-l-fulfillment bg-white p-5 shadow-soft">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fulfillment">
          Fulfillment
        </p>
        <h1 className="mt-1 text-xl font-medium text-ink">Settings</h1>
        <p className="mt-2 text-[13px] text-muted">
          These values are set in Vercel environment variables. Contact an admin to change them.
        </p>
      </header>

      <dl className="space-y-3 rounded-card border border-line bg-white p-5 text-[13px] shadow-soft">
        <div>
          <dt className="font-medium text-muted">SHOPIFY_TRACKING_COMPANY</dt>
          <dd className="mt-0.5 font-mono text-ink">{trackingCompany}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted">SHOPIFY_NOTIFY_CUSTOMER</dt>
          <dd className="mt-0.5 font-mono text-ink">{notifyCustomer}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted">UBEX_FULFILLED_STATUS</dt>
          <dd className="mt-0.5 font-mono text-ink">{fulfilledStatus}</dd>
        </div>
      </dl>

      <p className="text-[12px] text-muted">
        Seissense Ops Bot cron controls are on the Account page today.
      </p>
    </div>
  );
}
