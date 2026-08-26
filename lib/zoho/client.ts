const ZOHO_BASE_URL = (process.env.ZOHO_BASE_URL ?? "https://www.zohoapis.com").replace(/\/$/, "");
const ZOHO_ACCOUNTS_URL = (
  process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com"
).replace(/\/$/, "");
const REQUEST_TIMEOUT_MS =
  (Number.parseInt(process.env.ZOHO_REQUEST_TIMEOUT_SECONDS ?? "20", 10) || 20) * 1000;

type ZohoEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  orgId: string;
};

function getZohoEnv(): ZohoEnv | null {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN?.trim();
  const orgId = process.env.ZOHO_ORG_ID?.trim();
  if (!clientId || !clientSecret || !refreshToken || !orgId) return null;
  return { clientId, clientSecret, refreshToken, orgId };
}

export function isZohoConfigured(): boolean {
  return getZohoEnv() !== null;
}

/** Module-level access token cache. Shared across all requests in this process. */
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function refreshAccessToken(): Promise<string> {
  const env = getZohoEnv();
  if (!env) throw new Error("Zoho credentials not configured (ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN / ZOHO_ORG_ID missing)");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: env.refreshToken,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    const detail = json.error_description ?? json.error ?? String(res.status);
    throw new Error(`Zoho token refresh failed: ${detail}`);
  }

  const expiresIn = json.expires_in ?? 3600;
  // Subtract 5-minute buffer so we refresh before actual expiry.
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (expiresIn - 300) * 1000,
  };

  return json.access_token;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  return refreshAccessToken();
}

/**
 * Authenticated fetch against the Zoho Books API.
 * - Injects Authorization header and X-com-zoho-books-organizationid.
 * - On 401, refreshes the access token once and retries.
 * - Bounded by ZOHO_REQUEST_TIMEOUT_SECONDS (default 20s).
 */
export async function zohoFetch(path: string, init?: RequestInit): Promise<Response> {
  const env = getZohoEnv();
  if (!env) throw new Error("Zoho credentials not configured");

  const pathPart = path.startsWith("/") ? path : `/${path}`;
  const url = `${ZOHO_BASE_URL}${pathPart}`;
  const { orgId } = env;

  async function attempt(token: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.headers ?? {}),
          Authorization: `Zoho-oauthtoken ${token}`,
          "X-com-zoho-books-organizationid": orgId,
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const message =
        err instanceof Error
          ? err.name === "AbortError"
            ? `Zoho request timed out after ${REQUEST_TIMEOUT_MS}ms`
            : err.message
          : String(err);
      throw new Error(`Zoho fetch failed: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  const token = await getAccessToken();
  let res = await attempt(token);

  // On 401, invalidate cache and retry once with a fresh token.
  if (res.status === 401) {
    tokenCache = null;
    const freshToken = await refreshAccessToken();
    res = await attempt(freshToken);
  }

  return res;
}
