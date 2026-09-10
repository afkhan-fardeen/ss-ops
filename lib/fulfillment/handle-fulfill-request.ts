import { NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import type { CreateFulfillmentInput, CreateFulfillmentResult } from "@/lib/shopify/fulfill-order";

type FulfillBody = {
  orderId: number;
  orderName?: string;
  trackingNumber: string;
  trackingUrl?: string;
};

/**
 * Shared body parsing / validation / auth for POST /api/fulfill and /api/store2/fulfill.
 * `fulfillFn` carries the store-specific push (createFulfillment vs createStore2Fulfillment).
 */
export async function handleFulfillRequest(
  req: Request,
  fulfillFn: (input: CreateFulfillmentInput) => Promise<CreateFulfillmentResult>,
): Promise<NextResponse> {
  let session;
  try {
    session = await requireModuleAccess("fulfillment");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
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

  const result = await fulfillFn({
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
