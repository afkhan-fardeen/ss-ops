/** Store 2 fulfillment. Mirrors lib/shopify/fulfill-order.ts but uses
 *  Store 2 credentials and passes store_id: 2 to all Supabase helpers. */

import {
  claimIdempotency,
  findLastSuccessForKey,
  idempotencyKey,
  logFulfillment,
  releaseIdempotency,
} from "@/lib/fulfillment/log";
import { getStore2Env, store2Fetch } from "./client";

type ShopifyFulfillmentOrder = {
  id: number;
  status: string;
  line_items?: Array<{ id: number; quantity: number }>;
};

type FulfillmentOrdersResponse = { fulfillment_orders: ShopifyFulfillmentOrder[] };

type ShopifyFulfillment = {
  id: number;
  status?: string;
  tracking_number?: string | null;
  tracking_company?: string | null;
};

type FulfillmentResponse = { fulfillment: ShopifyFulfillment };

export type CreateStore2FulfillmentInput = {
  orderId: number;
  orderName?: string;
  trackingNumber: string;
  trackingUrl?: string;
  createdBy?: string | null;
};

export type CreateStore2FulfillmentResult =
  | { ok: true; fulfillmentId: number; idempotent?: boolean }
  | { ok: false; error: string };

async function getOpenFulfillmentOrders(orderId: number): Promise<ShopifyFulfillmentOrder[]> {
  const data = await store2Fetch<FulfillmentOrdersResponse>(`/orders/${orderId}/fulfillment_orders.json`);
  const all = data.fulfillment_orders ?? [];
  return all.filter((fo) => {
    const s = (fo.status ?? "").toLowerCase();
    return s !== "closed" && s !== "cancelled";
  });
}

export async function createStore2Fulfillment(
  input: CreateStore2FulfillmentInput,
): Promise<CreateStore2FulfillmentResult> {
  const { company, notifyCustomer } = getStore2Env();
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber) return { ok: false, error: "Tracking number is required" };

  const orderName = input.orderName ?? String(input.orderId);
  const key = idempotencyKey(input.orderId, trackingNumber);

  const reserved = await claimIdempotency({
    key,
    shopifyOrderId: input.orderId,
    createdBy: input.createdBy ?? null,
    storeId: 2,
  });

  if (!reserved) {
    const prev = await findLastSuccessForKey(input.orderId, trackingNumber, 2);
    if (prev && prev.shopify_fulfillment_id) {
      return { ok: true, fulfillmentId: prev.shopify_fulfillment_id, idempotent: true };
    }
    return { ok: false, error: "Already attempted for this (order, tracking) today." };
  }

  try {
    const fulfillmentOrders = await getOpenFulfillmentOrders(input.orderId);
    if (fulfillmentOrders.length === 0) {
      const err = "No open fulfillment orders (already fulfilled or closed)";
      await logFulfillment({
        shopifyOrderId: input.orderId,
        shopifyOrderName: orderName,
        ubexTracking: trackingNumber,
        trackingUrl: input.trackingUrl ?? null,
        trackingCompany: company,
        status: "error",
        error: err,
        createdBy: input.createdBy ?? null,
        storeId: 2,
      });
      await releaseIdempotency(key, 2);
      return { ok: false, error: err };
    }

    const payload = {
      fulfillment: {
        message: "Ubex COD",
        notify_customer: notifyCustomer,
        tracking_info: {
          company,
          number: trackingNumber,
          ...(input.trackingUrl ? { url: input.trackingUrl } : {}),
        },
        line_items_by_fulfillment_order: fulfillmentOrders.map((fo) => ({
          fulfillment_order_id: fo.id,
        })),
      },
    };

    const data = await store2Fetch<FulfillmentResponse>(`/fulfillments.json`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await logFulfillment({
      shopifyOrderId: input.orderId,
      shopifyOrderName: orderName,
      ubexTracking: trackingNumber,
      trackingUrl: input.trackingUrl ?? null,
      trackingCompany: company,
      status: "success",
      shopifyFulfillmentId: data.fulfillment.id,
      requestPayload: payload,
      responsePayload: data,
      createdBy: input.createdBy ?? null,
      storeId: 2,
    });

    return { ok: true, fulfillmentId: data.fulfillment.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await logFulfillment({
      shopifyOrderId: input.orderId,
      shopifyOrderName: orderName,
      ubexTracking: trackingNumber,
      trackingUrl: input.trackingUrl ?? null,
      trackingCompany: company,
      status: "error",
      error: message,
      createdBy: input.createdBy ?? null,
      storeId: 2,
    });
    await releaseIdempotency(key, 2);
    return { ok: false, error: message };
  }
}
