import { isZohoConfigured, zohoFetch } from "./client";
import {
  classifyZohoResponse,
  parseZohoErrorResponse,
  zohoAuthExpiredResult,
  zohoBarcodeFieldNotConfiguredResult,
  zohoNotConfiguredResult,
  type ZohoErrorResult,
} from "./classify-error";
import {
  getUbexBarcodeFieldId,
  readUbexBarcodeFromItem,
  type ZohoItemCustomField,
} from "./barcode-field";

export type ZohoItemBarcodeRow = {
  itemId: string;
  name: string;
  sku: string;
  zohoBarcode: string;
};

export type ListZohoItemsWithBarcodesResult =
  | { ok: true; items: ZohoItemBarcodeRow[] }
  | { ok: false; error: ZohoErrorResult };

type ZohoItemApiRow = {
  item_id?: string;
  name?: string;
  sku?: string;
  custom_fields?: ZohoItemCustomField[];
};

type ZohoItemsListResponse = {
  code?: number;
  message?: string;
  items?: ZohoItemApiRow[];
  page_context?: { has_more_page?: boolean };
};

function normalizeSku(sku: string): string {
  return sku.trim();
}

export async function listZohoItemsWithBarcodes(): Promise<ListZohoItemsWithBarcodesResult> {
  if (!isZohoConfigured()) {
    return { ok: false, error: zohoNotConfiguredResult() };
  }

  const fieldId = getUbexBarcodeFieldId();
  if (!fieldId) {
    return { ok: false, error: zohoBarcodeFieldNotConfiguredResult() };
  }

  const orgId = process.env.ZOHO_ORG_ID!.trim();
  const out: ZohoItemBarcodeRow[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    let res: Response;
    try {
      res = await zohoFetch(
        `/books/v3/items?organization_id=${encodeURIComponent(orgId)}&page=${page}&per_page=200`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("token refresh failed") || message.includes("invalid_grant")) {
        return { ok: false, error: zohoAuthExpiredResult(message) };
      }
      return {
        ok: false,
        error: {
          category: "network",
          userMessage:
            "Couldn't reach Zoho — this looks like a network or timeout issue, not a data problem. Try again.",
          detail: message,
        },
      };
    }

    const parsed = await parseZohoErrorResponse(res);
    if (!parsed.ok) {
      return { ok: false, error: classifyZohoResponse(parsed) };
    }

    const json = parsed.body as ZohoItemsListResponse;
    const rows = json.items ?? [];

    for (const row of rows) {
      if (!row.item_id) continue;
      out.push({
        itemId: row.item_id,
        name: (row.name ?? "").trim() || "Unnamed item",
        sku: normalizeSku(row.sku ?? ""),
        zohoBarcode: readUbexBarcodeFromItem(row.custom_fields, fieldId),
      });
    }

    hasMore = Boolean(json.page_context?.has_more_page);
    page += 1;
    if (rows.length === 0) hasMore = false;
  }

  return { ok: true, items: out };
}
