import { ubexFetch } from "./client";
import { ubexJsonStatusOk } from "./http-status";

export type UbexInventoryItem = {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  sku: string;
  trackQty: boolean;
};

type UbexInventoryListResponse = {
  status?: number | string;
  msg?: string;
  count?: number;
  data?: Array<{
    id?: string;
    name?: string;
    barcode?: string;
    stock?: string | number;
    available_qty?: number;
    sku?: string;
    track_qty?: boolean;
  }>;
};

type UbexGetStockResponse = {
  status?: number | string;
  msg?: string;
  /** Live API shape */
  stock?: Array<{ uuid?: string; stock?: string | number; available_qty?: number }>;
  /** Doc sample shape */
  data?: Array<{ id?: string; stock?: string | number; available_qty?: number }>;
};

const PAGE_SIZE = 10;

function parseStock(raw: string | number | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

/** Live Ubex API: `available_qty` is sellable stock; `stock` is often 0 while qty lives in available_qty. */
function resolveUbexQuantity(stock?: string | number, availableQty?: number): number {
  if (typeof availableQty === "number" && Number.isFinite(availableQty)) {
    return Math.max(0, Math.floor(availableQty));
  }
  return parseStock(stock);
}

function mapRow(row: NonNullable<UbexInventoryListResponse["data"]>[number]): UbexInventoryItem | null {
  const id = row.id?.trim();
  if (!id) return null;
  return {
    id,
    name: (row.name ?? "").trim() || "—",
    barcode: (row.barcode ?? "").trim(),
    stock: resolveUbexQuantity(row.stock, row.available_qty),
    sku: (row.sku ?? "").trim(),
    trackQty: row.track_qty !== false,
  };
}

/** GET /api/v2/inventory?page=N — read-only list (10 items per page in Ubex API). */
export async function fetchUbexInventoryPage(page: number): Promise<UbexInventoryItem[]> {
  const res = await ubexFetch(`/api/v2/inventory?page=${page}`);
  const json = (await res.json()) as UbexInventoryListResponse;
  if (!res.ok) {
    throw new Error(`Ubex inventory list HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  if (!ubexJsonStatusOk(json.status)) {
    throw new Error(`Ubex inventory list error: ${json.msg ?? JSON.stringify(json).slice(0, 200)}`);
  }
  const out: UbexInventoryItem[] = [];
  for (const row of json.data ?? []) {
    const item = mapRow(row);
    if (item) out.push(item);
  }
  return out;
}

export function stockBalanceMaxItems(): number | null {
  const raw = process.env.STOCK_BALANCE_MAX_ITEMS?.trim();
  // Unset or 0 = load entire Ubex catalog (default).
  if (!raw || raw === "0") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

const PAGE_PARALLEL = 15;

/** Fetch Ubex inventory; paginates all pages when maxItems is null. */
export async function fetchUbexInventoryAll(
  maxItems: number | null = stockBalanceMaxItems(),
): Promise<UbexInventoryItem[]> {
  const out: UbexInventoryItem[] = [];
  let startPage = 1;

  while (maxItems === null || out.length < maxItems) {
    const pageNumbers = Array.from({ length: PAGE_PARALLEL }, (_, i) => startPage + i);
    const batches = await Promise.all(pageNumbers.map((p) => fetchUbexInventoryPage(p)));

    let stop = false;
    for (const batch of batches) {
      if (batch.length === 0) {
        stop = true;
        break;
      }
      out.push(...batch);
      if (batch.length < PAGE_SIZE) {
        stop = true;
        break;
      }
    }

    if (stop) break;
    startPage += PAGE_PARALLEL;
  }

  return maxItems === null ? out : out.slice(0, maxItems);
}

/** @deprecated alias — use fetchUbexInventoryAll */
export async function fetchUbexInventoryUpTo(
  maxItems: number | null = stockBalanceMaxItems(),
): Promise<UbexInventoryItem[]> {
  return fetchUbexInventoryAll(maxItems);
}

/** GET /api/v2/inventory/get-stock?ids[]=… — read-only fresh quantities for ids. */
export async function fetchUbexStockByIds(ids: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, number>();
  if (unique.length === 0) return out;

  const GET_STOCK_BATCH = 50;
  for (let i = 0; i < unique.length; i += GET_STOCK_BATCH) {
    const chunk = unique.slice(i, i + GET_STOCK_BATCH);
    const query = chunk.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
    const res = await ubexFetch(`/api/v2/inventory/get-stock?${query}`, { method: "GET" });
    const json = (await res.json()) as UbexGetStockResponse;
    if (!res.ok) {
      throw new Error(`Ubex get-stock HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    }
    if (!ubexJsonStatusOk(json.status)) {
      throw new Error(`Ubex get-stock error: ${json.msg ?? JSON.stringify(json).slice(0, 200)}`);
    }
    for (const row of json.stock ?? []) {
      const id = row.uuid?.trim();
      if (!id) continue;
      out.set(id, resolveUbexQuantity(row.stock, row.available_qty));
    }
    for (const row of json.data ?? []) {
      const id = row.id?.trim();
      if (!id || out.has(id)) continue;
      out.set(id, resolveUbexQuantity(row.stock, row.available_qty));
    }
  }
  return out;
}
