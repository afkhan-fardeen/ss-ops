import { NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { compareZohoUbexBarcodes } from "@/lib/zoho/compare-zoho-ubex-barcodes";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/zoho-books/barcode-compare — Zoho Ubex Barcode CF vs Ubex catalog cache. No live Ubex. */
export async function GET() {
  try {
    await requireModuleAccess("zohoBooks");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await compareZohoUbexBarcodes();
  if (!result.ok) {
    const status =
      result.error.category === "not_configured" || result.error.category === "cache_empty"
        ? 503
        : 502;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    rows: result.rows,
    summary: result.summary,
    fetchedAt: result.fetchedAt,
    cacheRefreshedAt: result.summary.cacheRefreshedAt,
    ubexCacheCount: result.summary.ubexCacheCount,
  });
}
