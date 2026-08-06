import { NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { loadStockRestockHistory } from "@/lib/stock/load-restock-history";

export const dynamic = "force-dynamic";

/** GET /api/stock-balance/history — restock audit log (admin or stock module grant). */
export async function GET() {
  try {
    await requireModuleAccess("stock");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { rows, error } = await loadStockRestockHistory();
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rows });
}
