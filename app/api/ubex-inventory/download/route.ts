import { NextResponse, type NextRequest } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { loadStockBalanceCatalog } from "@/lib/stock/load-stock-balance-preview";
import { buildUbexInventoryWorkbook, ubexInventoryFilename } from "@/lib/ubex/build-ubex-inventory-workbook";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** GET /api/ubex-inventory/download — full Ubex catalog and quantities as a filterable .xlsx. */
export async function GET(_req: NextRequest) {
  try {
    await requireModuleAccess("stock");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const catalog = await loadStockBalanceCatalog({ fresh: true });
    const wb = await buildUbexInventoryWorkbook(catalog.rows, catalog.store2Configured);
    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${ubexInventoryFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build inventory export";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
