"use server";

import { requireSession } from "@/lib/auth/require-session";
import { getCollectionWindow } from "@/lib/datetime/collection-window";
import { fetchCodOrders } from "@/lib/shopify/fetch-cod-orders";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup } from "@/lib/ubex/build-lookup";
import { sendCodListEmail } from "@/lib/email/send-cod-email";
import { createFulfillment } from "@/lib/shopify/fulfill-order";

export async function sendCodListEmailAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const window = getCollectionWindow();
    const { codOrders } = await fetchCodOrders({
      createdAtMinIso: window.createdAtMinIso,
      createdAtMaxIso: window.createdAtMaxIso,
    });
    const currencies = codOrders
      .map((o) => getCurrencyForCountry(o.shipping_address?.country_code).currency)
      .filter((c): c is string => Boolean(c));
    const ratesResult = await getRates(currencies);
    const lookup = await buildUbexLookup().catch(() => undefined);
    const rows = buildCodRows(codOrders, ratesResult.rates, lookup);
    const totalGbp = codOrders.reduce((s, o) => s + Number.parseFloat(o.total_price || "0"), 0);
    return await sendCodListEmail({ rows, orderCount: codOrders.length, totalGbp });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send";
    return { ok: false, error: message };
  }
}

export async function pushOrderFulfillmentAction(input: {
  orderId: number;
  orderName?: string;
  trackingNumber: string;
  trackingUrl?: string;
}): Promise<
  { ok: true; fulfillmentId: number; idempotent?: boolean } | { ok: false; error: string }
> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  if (!input || typeof input.orderId !== "number" || !Number.isFinite(input.orderId)) {
    return { ok: false, error: "Invalid orderId" };
  }
  const trackingNumber = (input.trackingNumber ?? "").trim();
  if (!trackingNumber) {
    return { ok: false, error: "Missing tracking number" };
  }

  const result = await createFulfillment({
    orderId: input.orderId,
    orderName: input.orderName,
    trackingNumber,
    trackingUrl: input.trackingUrl?.trim() || undefined,
    createdBy: session.userId ?? null,
  });
  return result;
}
