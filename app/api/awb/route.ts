import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { lookupOrderTracking } from "@/lib/awb/lookup-order-tracking";
import { fetchAwb } from "@/lib/ubex/fetch-awb";

/**
 * GET /api/awb?orderName=1234&store=1
 *
 * Resolves the UBEX tracking for a Shopify order, fetches the AWB PDF URL,
 * and returns it. The PDF URL is never persisted — it expires in 24h.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const orderName = searchParams.get("orderName")?.trim() ?? "";
  const storeParam = searchParams.get("store") ?? "1";

  if (!orderName) {
    return NextResponse.json(
      { ok: false, error: "orderName is required", reason: "validation" },
      { status: 400 },
    );
  }

  const storeId = storeParam === "2" ? 2 : 1;

  const trackingResult = await lookupOrderTracking(orderName, storeId);
  if (!trackingResult.ok) {
    return NextResponse.json(
      { ok: false, error: trackingResult.error, reason: trackingResult.reason },
      { status: 422 },
    );
  }

  const awbResult = await fetchAwb(trackingResult.tracking);
  if (!awbResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: awbResult.error,
        reason: "awb_error",
        tracking: trackingResult.tracking,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    pdfUrl: awbResult.pdfUrl,
    tracking: trackingResult.tracking,
    orderName: trackingResult.orderName,
    source: trackingResult.source,
  });
}
