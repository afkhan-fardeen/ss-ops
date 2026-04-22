import {
  claimIdempotency,
  findLastSuccessForKey,
  idempotencyKey,
  logFulfillment,
  releaseIdempotency,
} from "@/lib/fulfillment/log";

function getEnv(): { domain: string; token: string; version: string; company: string; notifyCustomer: boolean } {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2024-01";
  if (!domain || !token) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN");
  }
  const company = (process.env.SHOPIFY_TRACKING_COMPANY ?? "Other").trim() || "Other";
  const notifyCustomer = (process.env.SHOPIFY_NOTIFY_CUSTOMER ?? "true").toLowerCase() === "true";
  return { domain, token, version, company, notifyCustomer };
}

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

async function shopifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { domain, token, version } = getEnv();
  const url = `https://${domain}/admin/api/${version}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${res.status}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

export async function getOpenFulfillmentOrders(orderId: number): Promise<ShopifyFulfillmentOrder[]> {
  const data = await shopifyFetch<FulfillmentOrdersResponse>(`/orders/${orderId}/fulfillment_orders.json`);
  const all = data.fulfillment_orders ?? [];
  return all.filter((fo) => {
    const s = (fo.status ?? "").toLowerCase();
    return s !== "closed" && s !== "cancelled";
  });
}

export type CreateFulfillmentInput = {
  orderId: number;
  orderName?: string;
  trackingNumber: string;
  trackingUrl?: string;
  /** Supabase user id when Phase C Auth is active. */
  createdBy?: string | null;
};

export type CreateFulfillmentResult =
  | { ok: true; fulfillmentId: number; idempotent?: boolean }
  | { ok: false; error: string };

export async function createFulfillment(input: CreateFulfillmentInput): Promise<CreateFulfillmentResult> {
  const { company, notifyCustomer } = getEnv();
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber) return { ok: false, error: "Tracking number is required" };

  const orderName = input.orderName ?? String(input.orderId);
  const key = idempotencyKey(input.orderId, trackingNumber);

  const reserved = await claimIdempotency({
    key,
    shopifyOrderId: input.orderId,
    createdBy: input.createdBy ?? null,
  });

  if (!reserved) {
    const prev = await findLastSuccessForKey(input.orderId, trackingNumber);
    if (prev && prev.shopify_fulfillment_id) {
      return { ok: true, fulfillmentId: prev.shopify_fulfillment_id, idempotent: true };
    }
    // Previous attempt exists but wasn't recorded as success (e.g. log insert failed).
    // Still short-circuit to prevent double-push.
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
      });
      await releaseIdempotency(key);
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

    const data = await shopifyFetch<FulfillmentResponse>(`/fulfillments.json`, {
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
    });
    await releaseIdempotency(key);
    return { ok: false, error: message };
  }
}
