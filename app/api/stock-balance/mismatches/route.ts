import { NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { loadMismatchedStockBalance } from "@/lib/stock/load-stock-balance-preview";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/stock-balance/mismatches — full-catalog sweep, mismatch rows only. */
export async function GET() {
  let capturedBy: string | null = null;
  try {
    const session = await requireModuleAccess("stock");
    capturedBy = session.userId ?? null;
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const preview = await loadMismatchedStockBalance(capturedBy);
    return NextResponse.json({ ok: true, ...preview });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load mismatched stock";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
