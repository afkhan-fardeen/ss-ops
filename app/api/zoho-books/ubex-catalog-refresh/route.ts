import { NextResponse } from "next/server";
import { PortalAuthError } from "@/lib/auth/require-portal-admin";
import { requireModuleAccess } from "@/lib/auth/can-access-module";
import { getUbexToken } from "@/lib/ubex/client";
import { fetchUbexInventoryAll } from "@/lib/ubex/inventory";
import { replaceUbexInventoryCache } from "@/lib/supabase/ubex-inventory-cache";
import type { UbexInventoryCacheInsert } from "@/lib/supabase/ubex-inventory-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/zoho-books/ubex-catalog-refresh — snapshot Ubex inventory into Supabase by barcode. */
export async function POST() {
  try {
    await requireModuleAccess("zohoBooks");
  } catch (e) {
    if (e instanceof PortalAuthError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!getUbexToken()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          category: "not_configured",
          userMessage: "Ubex isn't connected. Add UBEX_API_TOKEN in environment settings.",
          detail: "Missing UBEX_API_TOKEN",
        },
      },
      { status: 503 },
    );
  }

  try {
    const items = await fetchUbexInventoryAll();
    const byBarcode = new Map<string, UbexInventoryCacheInsert>();
    let skippedNoBarcode = 0;
    let duplicateBarcodes = 0;

    for (const item of items) {
      const barcode = item.barcode.trim();
      if (!barcode) {
        skippedNoBarcode += 1;
        continue;
      }
      if (byBarcode.has(barcode)) {
        duplicateBarcodes += 1;
        continue;
      }
      byBarcode.set(barcode, {
        barcode,
        ubex_id: item.id,
        sku: item.sku,
        name: item.name,
        size: item.size,
        color: item.color,
        stock: item.stock,
      });
    }

    const saved = await replaceUbexInventoryCache([...byBarcode.values()]);

    return NextResponse.json({
      ok: true,
      count: saved.count,
      refreshedAt: saved.refreshedAt,
      skippedNoBarcode,
      duplicateBarcodes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          category: "network",
          userMessage:
            "Couldn't refresh the Ubex catalog. Check Ubex and Supabase, then try again.",
          detail: message,
        },
      },
      { status: 502 },
    );
  }
}
