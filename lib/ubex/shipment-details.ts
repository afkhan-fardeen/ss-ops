import { ubexFetch } from "./client";
import { ubexJsonStatusOk } from "./http-status";

type DetailsResponse = {
  status?: number | string;
  msg?: string;
  data?: Record<string, unknown>;
};

const REF_KEYS = new Set([
  "shipment_reference",
  "reference",
  "shipment_ref",
  "client_reference",
  "external_reference",
  "order_reference",
  "awb_reference",
  "merchant_reference",
  "shopify_order",
  "order_name",
  "invoice_number",
  // Confirmed in Ubex details: sender_barcode = last-4 of Shopify order name.
  "sender_barcode",
  "sender_reference",
  "barcode",
]);

export function keyLooksReferenceLike(key: string): boolean {
  const k = key.toLowerCase();
  return (
    REF_KEYS.has(k) ||
    k.includes("reference") ||
    k.includes("order") ||
    k.includes("shopify") ||
    k.includes("merchant") ||
    k.includes("invoice") ||
    k.includes("external") ||
    k === "awb" ||
    k.includes("awb_") ||
    k === "barcode" ||
    k.endsWith("_barcode")
  );
}

/**
 * Ubex details payload exposes `tracking_url` directly (e.g. https://ubex.co/tracking/UB...).
 * We only accept it when it actually contains the tracking id — Ubex sometimes returns a bare
 * base URL (`https://ubex.co/tracking/`) which is worthless.
 */
export function extractTrackingUrlFromDetails(
  data: Record<string, unknown> | undefined | null,
  tracking?: string,
): string {
  if (!data) return "";
  const direct = data["tracking_url"];
  if (typeof direct !== "string") return "";
  const trimmed = direct.trim();
  if (!trimmed) return "";
  if (tracking && !trimmed.includes(tracking)) return "";
  return trimmed;
}

function pushUnique(out: string[], seen: Set<string>, raw: string) {
  const t = raw.trim();
  if (t.length < 2 || t.length > 120 || seen.has(t)) return;
  seen.add(t);
  out.push(t);
}

/** Collect human reference strings from shipment details (API shape varies). */
export function collectReferenceStringsFromDetails(data: Record<string, unknown> | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  if (!data) return out;

  function walk(node: unknown, depth: number, parentKey?: string) {
    if (!node || depth > 10) return;

    if (typeof node === "string") {
      if (parentKey && keyLooksReferenceLike(parentKey)) {
        pushUnique(out, seen, node);
      }
      return;
    }

    if (typeof node === "number" && Number.isFinite(node) && parentKey && keyLooksReferenceLike(parentKey)) {
      pushUnique(out, seen, String(node));
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1, parentKey);
      return;
    }

    if (typeof node === "object") {
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        if (typeof val === "string" && keyLooksReferenceLike(key)) {
          pushUnique(out, seen, val);
        } else if (typeof val === "number" && Number.isFinite(val) && keyLooksReferenceLike(key)) {
          pushUnique(out, seen, String(val));
        } else {
          walk(val, depth + 1, key);
        }
      }
    }
  }

  walk(data, 0);
  return out;
}

export async function fetchShipmentDetails(tracking: string): Promise<Record<string, unknown> | null> {
  const safe = encodeURIComponent(tracking);
  const res = await ubexFetch(`/api/shipments/details/${safe}`);
  const json = (await res.json()) as DetailsResponse;
  if (!res.ok || !ubexJsonStatusOk(json.status)) {
    return null;
  }
  const d = json.data;
  if (d && typeof d === "object") return d as Record<string, unknown>;
  return null;
}
