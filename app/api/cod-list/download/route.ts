import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { getCollectionWindow } from "@/lib/datetime/collection-window";
import { fetchCodOrders } from "@/lib/shopify/fetch-cod-orders";
import { getRates } from "@/lib/fx/getRates";
import { getCurrencyForCountry } from "@/lib/currency";
import { buildCodRows } from "@/lib/cod/build-rows";
import { buildUbexLookup } from "@/lib/ubex/build-lookup";
import { buildCodWorkbook, codFilenameFromDate } from "@/lib/excel";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const wb = await buildCodWorkbook(rows);
    const filename = codFilenameFromDate();

    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
