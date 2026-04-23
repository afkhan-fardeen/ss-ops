import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getCollectionWindow } from "@/lib/datetime/collection-window";
import { fetchCodOrders } from "@/lib/shopify/fetch-cod-orders";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup } from "@/lib/ubex/build-lookup";
import { sendCodListEmail } from "@/lib/email/send-cod-email";

/**
 * POST /api/cod-list/email
 * Sends the COD list summary email.
 */
export async function POST() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
    const result = await sendCodListEmail({ rows, orderCount: codOrders.length, totalGbp });
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to send";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
