import { NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { loadStockAlerts } from "@/lib/stock/compute-stock-alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/stock-alerts/scan — full-catalog scan, low-stock/stockout rows only. */
export async function GET() {
  let capturedBy: string | null = null;
  try {
    const session = await requireModuleAccess("stockAlerts");
    capturedBy = session.userId ?? null;
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await loadStockAlerts({ capturedBy });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to scan stock levels";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
