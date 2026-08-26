import { NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { findBarcodeMatchCandidates } from "@/lib/zoho/match-barcode-candidates";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/zoho-books/barcode-candidates — scan Zoho + Shopify for barcode fill candidates. */
export async function GET() {
  try {
    await requireModuleAccess("zohoBooks");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await findBarcodeMatchCandidates();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    candidates: result.candidates,
    summary: result.summary,
    store2Configured: result.store2Configured,
  });
}
