import { CODListView, type InitialLogEntry } from "@/components/cod-list/CODListView";
import { getCollectionWindow } from "@/lib/datetime/collection-window";
import { fetchCodOrders } from "@/lib/shopify/fetch-cod-orders";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup, shopifyLast4Set, type UbexLookup } from "@/lib/ubex/build-lookup";
import { getUbexToken } from "@/lib/ubex/client";
import { getLastLogsForOrders } from "@/lib/fulfillment/log";
import { AlertTriangle } from "lucide-react";

export const revalidate = 60;

export default async function CodListPage() {
  let error: string | null = null;
  let windowLabel = "";
  let ratesView:
    | { rates: Record<string, number>; fetchedAt: string; stale: boolean; source: string }
    | null = null;
  let rows: ReturnType<typeof buildCodRows> = [];
  let ordersScannedInWindow = 0;
  const ubexTokenConfigured = Boolean(getUbexToken());
  let ubexLookup: UbexLookup | undefined;
  let initialLogs: InitialLogEntry[] = [];

  try {
    const window = getCollectionWindow();
    windowLabel = window.label;

    const { codOrders, ordersScannedInWindow: scanned } = await fetchCodOrders({
      createdAtMinIso: window.createdAtMinIso,
      createdAtMaxIso: window.createdAtMaxIso,
    });
    ordersScannedInWindow = scanned;

    // Shopify → (FX, Ubex) in parallel. Ubex early-exits once every COD last-4 is matched.
    const currencies = codOrders
      .map((o) => getCurrencyForCountry(o.shipping_address?.country_code).currency)
      .filter((c): c is string => Boolean(c));
    const needed = shopifyLast4Set(codOrders);

    const [ratesResult, ubexResult] = await Promise.all([
      getRates(currencies),
      buildUbexLookup({ needed }).catch((e) => {
        console.warn("[ubex] lookup failed:", e);
        return undefined as UbexLookup | undefined;
      }),
    ]);

    ratesView = {
      rates: ratesResult.rates,
      fetchedAt: ratesResult.fetchedAt,
      stale: ratesResult.stale,
      source: ratesResult.source,
    };
    ubexLookup = ubexResult;
    rows = buildCodRows(codOrders, ratesResult.rates, ubexLookup);

    // Hydrate initial row states from Supabase fulfillment_log (if configured).
    const logs = await getLastLogsForOrders(codOrders.map((o) => o.id)).catch(() => new Map());
    initialLogs = rows
      .map((r): InitialLogEntry | null => {
        const log = logs.get(r.orderId);
        if (!log) return null;
        return {
          orderName: r.orderName,
          status: log.status === "success" ? "success" : "error",
          message: log.error ?? undefined,
          fulfillmentId: log.shopify_fulfillment_id ?? undefined,
        };
      })
      .filter((x): x is InitialLogEntry => Boolean(x));
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load COD list";
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-portal-red/25 bg-portal-redSoft p-6 text-portal-text">
        <div className="flex items-center gap-2 text-portal-red">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Could not load COD list</h2>
        </div>
        <p className="mt-2 text-[13px] text-portal-text">{error}</p>
        <p className="mt-3 font-mono text-[11px] text-portal-text2">
          Check env vars, Shopify token, and network. FX cache (Supabase) is optional; Frankfurter + open.er-api load
          without it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="animate-fade-up rounded-card border border-portal-border bg-portal-bg2 p-5 shadow-soft">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-portal-text3">
              Collection window
            </h2>
            <p className="mt-1 text-[14px] font-medium text-portal-text">{windowLabel}</p>
          </div>
          <p className="font-mono text-[11px] text-portal-text3">
            {ordersScannedInWindow} order{ordersScannedInWindow === 1 ? "" : "s"} scanned · {rows.length} COD
          </p>
        </div>
      </section>
      <CODListView
        rows={rows}
        ordersScannedInWindow={ordersScannedInWindow}
        ratesView={ratesView}
        ubexTokenConfigured={ubexTokenConfigured}
        ubexTotalShipments={ubexLookup?.totalShipments}
        ubexConflictsCount={ubexLookup?.last4Conflicts.size}
        ubexApiMessage={ubexLookup?.apiMessage}
        ubexError={ubexLookup?.error}
        initialLogs={initialLogs}
      />
    </div>
  );
}
