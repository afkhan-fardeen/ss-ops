import { NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { loadStockErrors } from "@/lib/stock/load-stock-errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/stock-balance/errors — data-quality issues + unresolved sync failures. */
export async function GET() {
  try {
    await requireModuleAccess("stock");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await loadStockErrors();
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load stock errors";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
