export type ZohoErrorCategory =
  | "not_configured"
  | "auth_expired"
  | "insufficient_scope"
  | "org_mismatch"
  | "rate_limited"
  | "network"
  | "zoho_outage"
  | "item_not_found"
  | "field_missing"
  | "unknown";

export type ZohoErrorResult = {
  category: ZohoErrorCategory;
  userMessage: string;
  detail: string;
  httpStatus?: number;
};

type ZohoErrorBody = {
  code?: number | string;
  message?: string;
  error?: string;
};

export function zohoNotConfiguredResult(): ZohoErrorResult {
  return {
    category: "not_configured",
    userMessage:
      "Zoho isn't connected. Add the Zoho credentials in Vercel's environment settings before this will work.",
    detail: "Missing ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN / ZOHO_ORG_ID",
  };
}

export function zohoBarcodeFieldNotConfiguredResult(): ZohoErrorResult {
  return {
    category: "not_configured",
    userMessage:
      "The Ubex Barcode custom field isn't configured. Set ZOHO_UBEX_BARCODE_CF_ID in Vercel to the numeric customfield_id from Zoho (run scripts/zoho-discover-barcode-field.ts).",
    detail: "Missing ZOHO_UBEX_BARCODE_CF_ID environment variable",
  };
}

export function zohoNetworkErrorResult(message: string): ZohoErrorResult {
  return {
    category: "network",
    userMessage:
      "Couldn't reach Zoho — this looks like a network or timeout issue, not a data problem. Try again.",
    detail: message,
  };
}

export function zohoAuthExpiredResult(detail: string): ZohoErrorResult {
  return {
    category: "auth_expired",
    userMessage:
      "Zoho's connection has expired or been disconnected. It needs to be re-authorized — the refresh token in Vercel is no longer valid.",
    detail,
  };
}

function bodyText(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string") return body;
  const obj = body as ZohoErrorBody;
  const parts = [obj.message, obj.error, obj.code != null ? String(obj.code) : ""].filter(Boolean);
  return parts.join(" — ") || JSON.stringify(body).slice(0, 500);
}

function mentionsScope(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("scope") ||
    lower.includes("permission") ||
    lower.includes("oauth") ||
    lower.includes("not authorized")
  );
}

function mentionsOrgMismatch(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("organization") && (lower.includes("not found") || lower.includes("invalid"));
}

function mentionsFieldMissing(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("custom field") ||
    lower.includes("custom_fields") ||
    lower.includes("field is not valid") ||
    lower.includes("invalid field")
  );
}

function zohoErrorCode(body: unknown): number | null {
  if (body == null || typeof body !== "object") return null;
  const code = (body as ZohoErrorBody).code;
  if (code == null) return null;
  const n = typeof code === "number" ? code : Number(code);
  return Number.isFinite(n) ? n : null;
}

function zohoBooksRoleDeniedResult(detail: string, httpStatus?: number): ZohoErrorResult {
  return {
    category: "insufficient_scope",
    userMessage:
      "OAuth scopes look fine, but this Zoho Books user role can't edit items. Check Settings → Users & Roles in Zoho Books and ensure the account that authorized the app can update items.",
    detail,
    httpStatus,
  };
}

function mentionsBooksRoleDenied(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("do not have the permission") ||
    lower.includes("don't have permission") ||
    lower.includes("contact your administrator") ||
    lower.includes("contact administrator")
  );
}

/** Classify a Zoho API failure from HTTP status and parsed body. */
export function classifyZohoError(status: number, body: unknown): ZohoErrorResult {
  const detail = bodyText(body);
  const code = zohoErrorCode(body);

  if (code === 104003 || (code === -1 && mentionsBooksRoleDenied(detail))) {
    return zohoBooksRoleDeniedResult(detail, status);
  }

  if (status === 429) {
    return {
      category: "rate_limited",
      userMessage:
        "Zoho is temporarily rate-limiting requests. Wait a minute and try again — this isn't a data problem, just too many requests too fast.",
      detail,
      httpStatus: status,
    };
  }

  if (status === 404) {
    return {
      category: "item_not_found",
      userMessage:
        "This item no longer exists in Zoho — it may have been deleted since the last scan. Re-scan to refresh the list.",
      detail,
      httpStatus: status,
    };
  }

  if (status === 401 || status === 403) {
    if (mentionsScope(detail)) {
      return {
        category: "insufficient_scope",
        userMessage:
          "Zoho rejected this because the connection doesn't have permission to read/update items. Re-authorize with ZohoBooks.settings.READ and ZohoBooks.settings.UPDATE (Zoho's Items API uses the settings scope, not items.READ).",
        detail,
        httpStatus: status,
      };
    }
    return {
      category: "insufficient_scope",
      userMessage:
        "Zoho rejected this because the connection doesn't have permission to read/update items. Re-authorize with ZohoBooks.settings.READ and ZohoBooks.settings.UPDATE (Zoho's Items API uses the settings scope, not items.READ).",
      detail,
      httpStatus: status,
    };
  }

  if (mentionsOrgMismatch(detail)) {
    return {
      category: "org_mismatch",
      userMessage:
        "The configured Zoho organization ID doesn't match any organization this connection can access. Check ZOHO_ORG_ID in Vercel.",
      detail,
      httpStatus: status,
    };
  }

  if (status >= 500) {
    return {
      category: "zoho_outage",
      userMessage:
        "Zoho's own API is having trouble responding right now. This is on Zoho's side — try again shortly.",
      detail,
      httpStatus: status,
    };
  }

  if (mentionsFieldMissing(detail)) {
    return {
      category: "field_missing",
      userMessage:
        "Couldn't find the 'Ubex Barcode' custom field — check ZOHO_UBEX_BARCODE_CF_ID matches the field under Zoho Settings → Items → Field Customization (run scripts/zoho-discover-barcode-field.ts).",
      detail,
      httpStatus: status,
    };
  }

  return {
    category: "unknown",
    userMessage:
      "Zoho returned an error we don't have a specific message for — see the technical detail below.",
    detail: detail || `HTTP ${status}`,
    httpStatus: status,
  };
}

export type ParsedZohoResponse = {
  ok: boolean;
  status: number;
  body: unknown;
  rawText: string;
};

/** Safely read a Zoho Response — never throws on malformed JSON. */
export async function parseZohoErrorResponse(res: Response): Promise<ParsedZohoResponse> {
  const status = res.status;
  const rawText = await res.text();
  let body: unknown = rawText;
  if (rawText.trim()) {
    try {
      body = JSON.parse(rawText) as unknown;
    } catch {
      body = rawText;
    }
  } else {
    body = null;
  }
  return { ok: res.ok, status, body, rawText };
}

export function classifyZohoResponse(parsed: ParsedZohoResponse): ZohoErrorResult {
  const detail =
    typeof parsed.body === "object" && parsed.body !== null
      ? bodyText(parsed.body)
      : parsed.rawText.slice(0, 500) || `HTTP ${parsed.status}`;
  const result = classifyZohoError(parsed.status, parsed.body);
  if (!result.detail) {
    result.detail = detail;
  }
  result.httpStatus = parsed.status;
  return result;
}

/** Page-level errors that block the entire feature. */
export function isPageLevelZohoError(category: ZohoErrorCategory): boolean {
  return (
    category === "not_configured" ||
    category === "auth_expired" ||
    category === "insufficient_scope" ||
    category === "org_mismatch" ||
    category === "zoho_outage" ||
    category === "network"
  );
}
