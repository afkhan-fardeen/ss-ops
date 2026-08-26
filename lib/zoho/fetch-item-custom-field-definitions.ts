import { isZohoConfigured, zohoFetch } from "./client";
import {
  classifyZohoResponse,
  parseZohoErrorResponse,
  zohoAuthExpiredResult,
  zohoNotConfiguredResult,
  type ZohoErrorResult,
} from "./classify-error";
import { resolveFieldDefinitionId } from "./barcode-field";

export type ZohoItemFieldDefinition = {
  customfield_id?: string;
  field_id?: string;
  label?: string;
  api_name?: string;
  data_type?: string;
  is_active?: boolean;
};

export type FetchItemFieldDefinitionsResult =
  | { ok: true; fields: ZohoItemFieldDefinition[] }
  | { ok: false; error: ZohoErrorResult };

type ZohoFieldsListResponse = {
  code?: number;
  message?: string;
  fields?: ZohoItemFieldDefinition[];
};

type ZohoCustomFieldsListResponse = {
  code?: number;
  message?: string;
  customfields?: { item?: ZohoItemFieldDefinition[] };
};

async function fetchSettingsFields(orgId: string): Promise<Response> {
  return zohoFetch(
    `/books/v3/settings/fields?organization_id=${encodeURIComponent(orgId)}&entity=item`,
  );
}

async function fetchSettingsCustomFields(orgId: string): Promise<Response> {
  return zohoFetch(
    `/books/v3/settings/customfields?organization_id=${encodeURIComponent(orgId)}&entity=item`,
  );
}

function parseFieldDefinitions(body: unknown): ZohoItemFieldDefinition[] {
  const fieldsResponse = body as ZohoFieldsListResponse;
  if (Array.isArray(fieldsResponse.fields)) {
    return fieldsResponse.fields;
  }
  const customResponse = body as ZohoCustomFieldsListResponse;
  return customResponse.customfields?.item ?? [];
}

export async function fetchItemCustomFieldDefinitions(): Promise<FetchItemFieldDefinitionsResult> {
  if (!isZohoConfigured()) {
    return { ok: false, error: zohoNotConfiguredResult() };
  }

  const orgId = process.env.ZOHO_ORG_ID!.trim();

  let res: Response;
  try {
    res = await fetchSettingsFields(orgId);
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

  let parsed = await parseZohoErrorResponse(res);

  // Some Books roles can read settings/customfields but not settings/fields.
  if (!parsed.ok) {
    const detail =
      typeof parsed.body === "object" && parsed.body !== null
        ? bodyTextFromBody(parsed.body)
        : parsed.rawText;
    const permissionDenied =
      parsed.status === 400 &&
      detail.toLowerCase().includes("permission") &&
      detail.toLowerCase().includes("item");

    if (permissionDenied) {
      try {
        res = await fetchSettingsCustomFields(orgId);
        parsed = await parseZohoErrorResponse(res);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
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
    }
  }

  if (!parsed.ok) {
    return { ok: false, error: classifyZohoResponse(parsed) };
  }

  const json = parsed.body as ZohoFieldsListResponse & ZohoCustomFieldsListResponse;
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

  return { ok: true, fields: parseFieldDefinitions(json) };
}

function bodyTextFromBody(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const obj = body as { message?: string; error?: string; code?: number | string };
  return [obj.message, obj.error, obj.code != null ? String(obj.code) : ""].filter(Boolean).join(" — ");
}

export function findItemFieldByLabel(
  fields: ZohoItemFieldDefinition[],
  label: string,
): ZohoItemFieldDefinition | undefined {
  const want = label.trim().toLowerCase();
  return fields.find((f) => (f.label ?? "").trim().toLowerCase() === want);
}

export function findItemFieldById(
  fields: ZohoItemFieldDefinition[],
  fieldId: string,
): ZohoItemFieldDefinition | undefined {
  const id = fieldId.trim();
  return fields.find((f) => resolveFieldDefinitionId(f) === id);
}
