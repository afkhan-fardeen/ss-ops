function baseUrl(): string {
  return (process.env.UBEX_API_BASE_URL ?? "https://ubex-clients.apis.delivery").replace(/\/$/, "");
}

export function getUbexToken(): string | null {
  const t = process.env.UBEX_API_TOKEN?.trim();
  return t ? t : null;
}

/**
 * Partner API examples use `?token=`; Bearer is optional. Query token is always sent;
 * Bearer is added unless UBEX_BEARER=0.
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
  if (useBearer) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(u.toString(), { ...init, headers, cache: "no-store" });

  if ((res.status === 401 || res.status === 403) && useBearer) {
    const h2 = new Headers(init?.headers);
    h2.set("Accept", "application/json");
    res = await fetch(u.toString(), { ...init, headers: h2, cache: "no-store" });
  }

  return res;
}
