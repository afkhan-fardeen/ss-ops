function baseUrl(): string {
  return (process.env.UBEX_API_BASE_URL ?? "https://ubex-clients.apis.delivery").replace(/\/$/, "");
}

export function getUbexToken(): string | null {
  const t = process.env.UBEX_API_TOKEN?.trim();
  return t ? t : null;
}

const REQUEST_TIMEOUT_MS =
  (Number.parseInt(process.env.UBEX_REQUEST_TIMEOUT_SECONDS ?? "25", 10) || 25) * 1000;
const MAX_ATTEMPTS = Math.max(1, Number.parseInt(process.env.UBEX_MAX_ATTEMPTS ?? "3", 10) || 3);
const BASE_BACKOFF_MS = 500;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

/**
 * Partner API examples use `?token=`; Bearer is optional. Query token is always sent;
 * Bearer is added unless UBEX_BEARER=0.
 *
 * Retries network errors and 5xx responses up to UBEX_MAX_ATTEMPTS with exponential backoff.
 * Each attempt is bounded by UBEX_REQUEST_TIMEOUT_SECONDS (default 25s) via AbortController —
 * this prevents undici's default header timeout from blowing up the whole request graph when
 * Ubex is slow.
 */
export async function ubexFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getUbexToken();
  if (!token) {
    throw new Error("UBEX_API_TOKEN is not set");
  }
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  const u = new URL(`${baseUrl()}${pathPart}`);
  u.searchParams.set("token", token);

  const useBearer = process.env.UBEX_BEARER !== "0";
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (useBearer) headers.set("Authorization", `Bearer ${token}`);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      let res = await fetch(u.toString(), {
        ...init,
        headers,
        cache: "no-store",
        signal: controller.signal,
      });

      // Some Ubex endpoints reject Bearer and want query-token only → retry once without Authorization.
      if ((res.status === 401 || res.status === 403) && useBearer) {
        const h2 = new Headers(init?.headers);
        h2.set("Accept", "application/json");
        res = await fetch(u.toString(), {
          ...init,
          headers: h2,
          cache: "no-store",
          signal: controller.signal,
        });
      }

      clearTimeout(timer);

      if (isRetriableStatus(res.status) && attempt < MAX_ATTEMPTS) {
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      // AbortError + network errors are retriable. Last attempt rethrows.
      if (attempt >= MAX_ATTEMPTS) break;
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.name === "AbortError"
        ? `Ubex request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : lastError.message
      : String(lastError);
  throw new Error(`Ubex fetch failed (${MAX_ATTEMPTS} attempts): ${message}`);
}
