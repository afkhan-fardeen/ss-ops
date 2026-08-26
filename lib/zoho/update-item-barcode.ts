import { isZohoConfigured, zohoFetch } from "./client";
import {
  classifyZohoResponse,
  parseZohoErrorResponse,
  zohoAuthExpiredResult,
  zohoBarcodeFieldNotConfiguredResult,
  zohoNotConfiguredResult,
  type ZohoErrorResult,
} from "./classify-error";
import { requireUbexBarcodeFieldId } from "./barcode-field";

export type UpdateBarcodeResult =
  | { ok: true }
  | { ok: false; error: ZohoErrorResult };

export async function updateZohoItemBarcode(
  itemId: string,
  barcode: string,
): Promise<UpdateBarcodeResult> {
  if (!isZohoConfigured()) {
    return { ok: false, error: zohoNotConfiguredResult() };
  }

  let fieldId: string;
  try {
    fieldId = requireUbexBarcodeFieldId();
  } catch {
    return { ok: false, error: zohoBarcodeFieldNotConfiguredResult() };
  }

  const orgId = process.env.ZOHO_ORG_ID!.trim();
  const trimmedBarcode = barcode.trim();
  if (!itemId.trim() || !trimmedBarcode) {
    return {
      ok: false,
      error: {
        category: "unknown",
        userMessage: "Missing item ID or barcode.",
        detail: "Validation failed before Zoho request",
      },
    };
  }

  let res: Response;
  try {
    res = await zohoFetch(
      `/books/v3/item/${encodeURIComponent(itemId)}/customfields?organization_id=${encodeURIComponent(orgId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_fields: [{ customfield_id: fieldId, value: trimmedBarcode }],
        }),
      },
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

  const json = parsed.body as { code?: number; message?: string };
  if (json.code != null && json.code !== 0) {
    return {
      ok: false,
      error: classifyZohoResponse({
        ok: false,
        status: parsed.status,
        body: json,
        rawText: parsed.rawText,
      }),
    };
  }

  return { ok: true };
}
