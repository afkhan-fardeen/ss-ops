import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { createFulfillment } from "@/lib/shopify/fulfill-order";

type FulfillBody = {
  orderId: number;
  orderName?: string;
  trackingNumber: string;
  trackingUrl?: string;
};

/**
 * POST /api/fulfill
 * Pushes a Shopify fulfillment with the provided tracking details.
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: FulfillBody;
  try {
    body = (await req.json()) as FulfillBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body.orderId !== "number" || !Number.isFinite(body.orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }
  const trackingNumber = (body.trackingNumber ?? "").trim();
  if (!trackingNumber) {
    return NextResponse.json({ ok: false, error: "Missing tracking number" }, { status: 400 });
  }

  const result = await createFulfillment({
    orderId: body.orderId,
    orderName: body.orderName,
    trackingNumber,
    trackingUrl: body.trackingUrl?.trim() || undefined,
    createdBy: session.userId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}
