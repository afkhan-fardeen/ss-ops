import {
  getUbexInventoryCacheMeta,
  readUbexInventoryCache,
} from "@/lib/supabase/ubex-inventory-cache";
import type { UbexInventoryCacheRow } from "@/lib/supabase/types";
import type { ZohoErrorResult } from "./classify-error";
import { listZohoItemsWithBarcodes } from "./list-zoho-items-with-barcodes";

export type BarcodeCompareStatus = "match" | "zoho_not_in_ubex" | "zoho_empty" | "ubex_only";

export type BarcodeCompareRow = {
  sku: string;
  zohoItemId: string | null;
  zohoName: string | null;
  zohoBarcode: string | null;
  ubexId: string | null;
  ubexName: string | null;
  ubexBarcode: string | null;
  status: BarcodeCompareStatus;
  /** True for leftover warehouse barcodes not present on any Zoho CF. */
  ubexOnly: boolean;
};

export type BarcodeCompareSummary = {
  total: number;
  match: number;
  zohoNotInUbex: number;
  zohoEmpty: number;
  ubexOnly: number;
  cacheRefreshedAt: string | null;
  ubexCacheCount: number;
};

export type BarcodeCompareError = {
  category: "not_configured" | "network" | "zoho" | "cache_empty";
  userMessage: string;
  detail: string;
  zohoError?: ZohoErrorResult;
};

export type CompareZohoUbexBarcodesResult =
  | {
      ok: true;
      rows: BarcodeCompareRow[];
      summary: BarcodeCompareSummary;
      fetchedAt: string;
    }
  | { ok: false; error: BarcodeCompareError };

function nz(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  return t.length > 0 ? t : null;
}

function classifyZohoRow(
  zohoBc: string | null,
  ubex: UbexInventoryCacheRow | undefined,
): BarcodeCompareStatus {
  if (!zohoBc) return "zoho_empty";
  if (!ubex) return "zoho_not_in_ubex";
  return "match";
}

function summarize(
  rows: BarcodeCompareRow[],
  cacheRefreshedAt: string | null,
  ubexCacheCount: number,
): BarcodeCompareSummary {
  const summary: BarcodeCompareSummary = {
    total: rows.filter((r) => !r.ubexOnly).length,
    match: 0,
    zohoNotInUbex: 0,
    zohoEmpty: 0,
    ubexOnly: 0,
    cacheRefreshedAt,
    ubexCacheCount,
  };

  for (const row of rows) {
    switch (row.status) {
      case "match":
        summary.match += 1;
        break;
      case "zoho_not_in_ubex":
        summary.zohoNotInUbex += 1;
        break;
      case "zoho_empty":
        summary.zohoEmpty += 1;
        break;
      case "ubex_only":
        summary.ubexOnly += 1;
        break;
    }
  }

  return summary;
}

export async function compareZohoUbexBarcodes(): Promise<CompareZohoUbexBarcodesResult> {
  let meta: Awaited<ReturnType<typeof getUbexInventoryCacheMeta>>;
  try {
    meta = await getUbexInventoryCacheMeta();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: {
        category: "not_configured",
        userMessage:
          "Couldn't read the Ubex catalog cache. Check Supabase, then use Refresh Ubex catalog.",
        detail: message,
      },
    };
  }

  if (!meta) {
    return {
      ok: false,
      error: {
        category: "not_configured",
        userMessage:
          "Supabase isn't configured, so the Ubex catalog can't be cached. Add the service role key, then refresh.",
        detail: "getSupabaseService() returned null",
      },
    };
  }

  if (meta.count === 0) {
    return {
      ok: false,
      error: {
        category: "cache_empty",
        userMessage:
          "The Ubex catalog hasn't been saved yet. Click Refresh Ubex catalog first (this can take several minutes), then Compare.",
        detail: "ubex_inventory_cache is empty",
      },
    };
  }

  let zohoResult: Awaited<ReturnType<typeof listZohoItemsWithBarcodes>>;
  let ubexCache: Map<string, UbexInventoryCacheRow>;

  try {
    [zohoResult, ubexCache] = await Promise.all([
      listZohoItemsWithBarcodes(),
      readUbexInventoryCache(),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: {
        category: "network",
        userMessage:
          "Couldn't reach Zoho or the Ubex cache — this looks like a network issue. Try again.",
        detail: message,
      },
    };
  }

  if (!zohoResult.ok) {
    return {
      ok: false,
      error: {
        category: "zoho",
        userMessage: zohoResult.error.userMessage,
        detail: zohoResult.error.detail,
        zohoError: zohoResult.error,
      },
    };
  }

  const reachedBarcodes = new Set<string>();
  const rows: BarcodeCompareRow[] = [];

  for (const zoho of zohoResult.items) {
    const zohoBc = nz(zoho.zohoBarcode);
    const ubex = zohoBc ? ubexCache.get(zohoBc) : undefined;
    if (zohoBc && ubex) reachedBarcodes.add(zohoBc);

    rows.push({
      sku: zoho.sku || "—",
      zohoItemId: zoho.itemId,
      zohoName: zoho.name,
      zohoBarcode: zohoBc,
      ubexId: ubex?.ubex_id ?? null,
      ubexName: ubex?.name ?? null,
      ubexBarcode: ubex ? nz(ubex.barcode) : null,
      status: classifyZohoRow(zohoBc, ubex),
      ubexOnly: false,
    });
  }

  for (const [barcode, ubex] of ubexCache) {
    if (reachedBarcodes.has(barcode)) continue;
    rows.push({
      sku: ubex.sku || barcode,
      zohoItemId: null,
      zohoName: null,
      zohoBarcode: null,
      ubexId: ubex.ubex_id,
      ubexName: ubex.name,
      ubexBarcode: barcode,
      status: "ubex_only",
      ubexOnly: true,
    });
  }

  rows.sort((a, b) => {
    if (a.ubexOnly !== b.ubexOnly) return a.ubexOnly ? 1 : -1;
    return a.sku.localeCompare(b.sku, undefined, { numeric: true });
  });

  return {
    ok: true,
    rows,
    summary: summarize(rows, meta.refreshedAt, meta.count),
    fetchedAt: new Date().toISOString(),
  };
}
