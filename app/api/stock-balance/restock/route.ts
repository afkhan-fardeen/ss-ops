import { NextResponse } from "next/server";
import { PortalAuthError, requirePortalAdmin } from "@/lib/auth/require-portal-admin";
import { stockBalanceMaxItems } from "@/lib/ubex/inventory";
import { restockItemToUbex, restockItemsToUbex } from "@/lib/stock/restock-to-ubex";

type SingleBody = { ubexId: string; barcode: string };
type BulkBody = { items: SingleBody[] };

function isBulkBody(body: unknown): body is BulkBody {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as BulkBody).items)
  );
}

function isSingleBody(body: unknown): body is SingleBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as SingleBody).ubexId === "string" &&
    typeof (body as SingleBody).barcode === "string" &&
    !("items" in body)
  );
}

function validateItem(item: SingleBody): string | null {
  if (!item.ubexId?.trim()) return "Missing ubexId";
  if (!item.barcode?.trim()) return "Missing barcode";
  return null;
}

/**
 * POST /api/stock-balance/restock
 * Admin-only. Sets Shopify on_hand to fresh Ubex qty. No Ubex writes.
 */
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requirePortalAdmin();
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const maxItems = stockBalanceMaxItems();
  const createdBy = admin.userId;

  if (isBulkBody(body)) {
    if (body.items.length === 0) {
      return NextResponse.json({ ok: false, error: "Empty items array" }, { status: 400 });
    }
    if (body.items.length > maxItems) {
      return NextResponse.json(
        { ok: false, error: `Max ${maxItems} items per bulk restock` },
        { status: 400 },
      );
    }
    for (const item of body.items) {
      const err = validateItem(item);
      if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }
    const results = await restockItemsToUbex(body.items, createdBy);
    return NextResponse.json({ ok: true, results });
  }

  if (isSingleBody(body)) {
    const err = validateItem(body);
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
    const result = await restockItemToUbex(body, createdBy);
    if (!result.ok) {
      const { ok: _ok, ...rest } = result;
      return NextResponse.json({ ok: false, ...rest }, { status: 422 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { ok: false, error: 'Body must be { ubexId, barcode } or { items: [...] }' },
    { status: 400 },
  );
}
