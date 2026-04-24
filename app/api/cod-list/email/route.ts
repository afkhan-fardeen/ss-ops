import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getCollectionWindow } from "@/lib/datetime/collection-window";
import { fetchCodOrders } from "@/lib/shopify/fetch-cod-orders";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup } from "@/lib/ubex/build-lookup";
import { sendCodListEmail } from "@/lib/email/send-cod-email";

/** POST /api/cod-list/email — sends the COD list email and logs it. */
export async function POST(req: Request) {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Support optional ?date=YYYY-MM-DD for historical windows
    const url = new URL(req.url);
    const dateKey = url.searchParams.get("date");

    let win: ReturnType<typeof getCollectionWindow>;
    if (dateKey) {
      const { getWindowForDateKey } = await import("@/lib/datetime/collection-window");
      win = getWindowForDateKey(dateKey);
    } else {
      win = getCollectionWindow();
    }

    const { codOrders } = await fetchCodOrders({
      createdAtMinIso: win.createdAtMinIso,
      createdAtMaxIso: win.createdAtMaxIso,
    });
    const currencies = codOrders
      .map((o) => getCurrencyForCountry(o.shipping_address?.country_code).currency)
      .filter((c): c is string => Boolean(c));
    const ratesResult = await getRates(currencies);
    const lookup = await buildUbexLookup().catch(() => undefined);
    const rows = buildCodRows(codOrders, ratesResult.rates, lookup);
    const totalGbp = codOrders.reduce((s, o) => s + Number.parseFloat(o.total_price || "0"), 0);

    const result = await sendCodListEmail({
      rows,
      orderCount: codOrders.length,
      totalGbp,
      windowStart: win.createdAtMinIso,
      windowEnd: win.createdAtMaxIso,
      sentByEmail: session.email ?? null,
    });

    if (!result.ok) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed to send" }, { status: 500 });
  }
}
