import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ShopifyOrder } from "@/lib/shopify/types";
import {
  deleteOrderCache,
  upsertOrderCache,
} from "@/lib/supabase/orders-cache";
import { upsertOrderLineItems } from "@/lib/supabase/order-line-items";

/**
 * Shopify webhook handler. One route handles every supported topic via the `[topic]` segment:
 *
 *   /api/webhooks/shopify/orders-create
 *   /api/webhooks/shopify/orders-updated
 *   /api/webhooks/shopify/orders-cancelled
 *   /api/webhooks/shopify/fulfillments-create
 *   /api/webhooks/shopify/fulfillments-update
 *
 * Shopify uses `/` in topic names, so we use `-` in the URL segment and map it back.
 */

export const runtime = "nodejs"; // node:crypto

type TopicHandler = (raw: string, shop: string) => Promise<void>;

const handlers: Record<string, TopicHandler> = {
  "orders/create": handleOrdersUpsert,
  "orders/updated": handleOrdersUpsert,
  "orders/cancelled": handleOrdersCancelled,
  "fulfillments/create": handleFulfillmentSync,
  "fulfillments/update": handleFulfillmentSync,
};

function topicFromSegment(segment: string, headerTopic: string | null): string {
  if (headerTopic) return headerTopic;
  return segment.replace(/-/g, "/");
}

function verifyHmac(rawBody: string, receivedHmac: string, secret: string): boolean {
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(receivedHmac, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { topic: string } },
) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SHOPIFY_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const headerTopic = req.headers.get("x-shopify-topic");
  const headerHmac = req.headers.get("x-shopify-hmac-sha256");
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";

  if (!headerHmac) return NextResponse.json({ error: "Missing HMAC" }, { status: 401 });

  const rawBody = await req.text();
  if (!verifyHmac(rawBody, headerHmac, secret)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = topicFromSegment(params.topic, headerTopic);
  const handler = handlers[topic];
  if (!handler) {
    return NextResponse.json({ ok: true, warning: `No handler for topic "${topic}"` });
  }

  try {
    await handler(rawBody, shop);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[shopify-webhook]", topic, e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleOrdersUpsert(raw: string): Promise<void> {
  const order = JSON.parse(raw) as ShopifyOrder & { created_at?: string };
  await upsertOrderCache(order);
  await upsertOrderLineItems(order, 1);
}

async function handleOrdersCancelled(raw: string): Promise<void> {
  // Keep the cancellation in cache but mark it cancelled; cleaner than a hard delete for the UI.
  const order = JSON.parse(raw) as ShopifyOrder & { created_at?: string };
  if (order?.id) await upsertOrderCache({ ...order, fulfillment_status: "cancelled" });
  else if (typeof (order as unknown as { id?: number }).id === "number") {
    await deleteOrderCache((order as unknown as { id: number }).id);
  }
}

async function handleFulfillmentSync(raw: string): Promise<void> {
  const payload = JSON.parse(raw) as { order_id?: number; status?: string };
  const orderId = typeof payload.order_id === "number" ? payload.order_id : null;
  if (!orderId) return;

  // Re-fetch the canonical order from Shopify so our cache stays consistent
  // (the fulfillment webhook body only contains the fulfillment, not the full order).
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2024-01";
  if (!domain || !token) return;

  const res = await fetch(
    `https://${domain}/admin/api/${version}/orders/${orderId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": token,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) return;
  const { order } = (await res.json()) as { order: ShopifyOrder & { created_at?: string } };
  if (order) {
    await upsertOrderCache(order);
    await upsertOrderLineItems(order, 1);
  }
}
