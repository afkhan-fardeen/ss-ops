import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/require-session";

/**
 * Admin-only endpoint that (re)registers the portal's Shopify webhook subscriptions.
 * Idempotent: existing subscriptions for the same (topic, address) are skipped.
 *
 * POST /api/admin/register-webhooks
 */

type ShopifyWebhook = {
  id: number;
  topic: string;
  address: string;
  created_at: string;
  updated_at: string;
  format: string;
};

const TOPIC_SEGMENTS: Array<{ topic: string; segment: string }> = [
  { topic: "orders/create", segment: "orders-create" },
  { topic: "orders/updated", segment: "orders-updated" },
  { topic: "orders/cancelled", segment: "orders-cancelled" },
  { topic: "fulfillments/create", segment: "fulfillments-create" },
  { topic: "fulfillments/update", segment: "fulfillments-update" },
];

function env() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2024-01";
  if (!domain || !token) throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN");
  return { domain, token, version };
}

function publicBaseUrl(req: NextRequest): string {
  const envUrl = process.env.PORTAL_PUBLIC_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  const origin = req.nextUrl.origin;
  return origin.replace(/\/$/, "");
}

async function shopifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { domain, token, version } = env();
  const res = await fetch(`https://${domain}/admin/api/${version}${path}`, {
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

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const base = publicBaseUrl(req);
    const { webhooks: existing } = await shopifyFetch<{ webhooks: ShopifyWebhook[] }>(
      `/webhooks.json?limit=250`,
    );

    const results: Array<{ topic: string; address: string; action: "created" | "skipped" | "updated" }> = [];

    for (const { topic, segment } of TOPIC_SEGMENTS) {
      const address = `${base}/api/webhooks/shopify/${segment}`;
      const match = existing.find((w) => w.topic === topic && w.address === address);
      if (match) {
        results.push({ topic, address, action: "skipped" });
        continue;
      }
      // Create via REST.
      await shopifyFetch(`/webhooks.json`, {
        method: "POST",
        body: JSON.stringify({
          webhook: { topic, address, format: "json" },
        }),
      });
      results.push({ topic, address, action: "created" });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to register webhooks" },
      { status: 500 },
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { webhooks } = await shopifyFetch<{ webhooks: ShopifyWebhook[] }>(`/webhooks.json?limit=250`);
  return NextResponse.json({ ok: true, webhooks });
}
