import { isStore2Configured } from "@/lib/store2/client";
import {
  fetchShopifySkuBarcodeMap,
  getDefaultShopifyLocation,
} from "@/lib/shopify/inventory-read";
import { listZohoItemsMissingBarcode } from "./list-items-missing-barcode";
import {
  zohoNetworkErrorResult,
  type ZohoErrorResult,
} from "./classify-error";

export type BarcodeMatchStatus = "clean" | "conflict" | "no-match";

export type BarcodeMatchCandidate = {
  zohoItemId: string;
  zohoName: string;
  zohoSku: string;
  status: BarcodeMatchStatus;
  proposedBarcode: string | null;
  storeABarcode: string | null;
  storeBBarcode: string | null;
};

export type BarcodeMatchSummary = {
  total: number;
  clean: number;
  conflict: number;
  noMatch: number;
};

export type FindBarcodeMatchResult =
  | {
      ok: true;
      candidates: BarcodeMatchCandidate[];
      summary: BarcodeMatchSummary;
      store2Configured: boolean;
    }
  | { ok: false; error: ZohoErrorResult };

function lookupBarcode(map: Map<string, string>, sku: string): string | null {
  const bc = map.get(sku.trim());
  return bc && bc.length > 0 ? bc : null;
}

function classifyMatch(
  storeA: string | null,
  storeB: string | null,
): Pick<BarcodeMatchCandidate, "status" | "proposedBarcode"> {
  if (storeA && storeB) {
    if (storeA === storeB) {
      return { status: "clean", proposedBarcode: storeA };
    }
    return { status: "conflict", proposedBarcode: null };
  }
  if (storeA) {
    return { status: "clean", proposedBarcode: storeA };
  }
  if (storeB) {
    return { status: "clean", proposedBarcode: storeB };
  }
  return { status: "no-match", proposedBarcode: null };
}

function summarize(candidates: BarcodeMatchCandidate[]): BarcodeMatchSummary {
  let clean = 0;
  let conflict = 0;
  let noMatch = 0;
  for (const c of candidates) {
    if (c.status === "clean") clean += 1;
    else if (c.status === "conflict") conflict += 1;
    else noMatch += 1;
  }
  return { total: candidates.length, clean, conflict, noMatch };
}

export async function findBarcodeMatchCandidates(): Promise<FindBarcodeMatchResult> {
  let zohoResult: Awaited<ReturnType<typeof listZohoItemsMissingBarcode>>;
  try {
    zohoResult = await listZohoItemsMissingBarcode();
  } catch (err) {
    return {
      ok: false,
      error: zohoNetworkErrorResult(err instanceof Error ? err.message : String(err)),
    };
  }

  if (!zohoResult.ok) {
    return { ok: false, error: zohoResult.error };
  }

  const store2Configured = isStore2Configured();

  let storeAMap: Map<string, string>;
  let storeBMap: Map<string, string> | null = null;

  try {
    const locationA = await getDefaultShopifyLocation(1);
    const storeAPromise = fetchShopifySkuBarcodeMap(locationA.id, 1);
    const storeBPromise = store2Configured
      ? getDefaultShopifyLocation(2).then((loc) => fetchShopifySkuBarcodeMap(loc.id, 2))
      : Promise.resolve(new Map<string, string>());

    [storeAMap, storeBMap] = await Promise.all([storeAPromise, storeBPromise]);
  } catch (err) {
    return {
      ok: false,
      error: zohoNetworkErrorResult(
        err instanceof Error ? err.message : "Failed to load Shopify catalog",
      ),
    };
  }

  const candidates: BarcodeMatchCandidate[] = zohoResult.items.map((item) => {
    const storeABarcode = lookupBarcode(storeAMap, item.sku);
    const storeBBarcode = store2Configured && storeBMap ? lookupBarcode(storeBMap, item.sku) : null;
    const { status, proposedBarcode } = classifyMatch(storeABarcode, storeBBarcode);
    return {
      zohoItemId: item.itemId,
      zohoName: item.name,
      zohoSku: item.sku,
      status,
      proposedBarcode,
      storeABarcode,
      storeBBarcode,
    };
  });

  return {
    ok: true,
    candidates,
    summary: summarize(candidates),
    store2Configured,
  };
}
