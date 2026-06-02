import { NextResponse } from "next/server";
import { PortalAuthError, requirePortalAdmin } from "@/lib/auth/require-portal-admin";
import { loadStockBalancePreview } from "@/lib/stock/load-stock-balance-preview";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/stock-balance/preview — full Ubex catalog join (admin only). */
export async function GET() {
  try {
    await requirePortalAdmin();
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preview = await loadStockBalancePreview();
    return NextResponse.json({ ok: true, ...preview });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load stock balance";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
