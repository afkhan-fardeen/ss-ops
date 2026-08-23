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

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function inventoryPageDelayMs(): number {
  return Math.max(0, Number.parseInt(process.env.UBEX_INVENTORY_PAGE_DELAY_MS ?? "350", 10) || 350);
}

/** Ubex rate-limits burst traffic; default 1 page at a time (max 3 via env). */
function inventoryPageParallel(): number {
  const n = Number.parseInt(process.env.UBEX_INVENTORY_PAGE_PARALLEL ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(3, Math.floor(n));
}

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
  return fetchUbexInventoryWithQuery(page);
}

/** GET /api/v2/inventory?search=…&page=N — scoped list by Ubex search term. */
export async function searchUbexInventory(
  query: string,
  page = 1,
): Promise<UbexInventoryItem[]> {
  const q = query.trim();
  if (!q) return fetchUbexInventoryPage(page);
  return fetchUbexInventoryWithQuery(page, q);
}

async function fetchUbexInventoryWithQuery(
  page: number,
  search?: string,
): Promise<UbexInventoryItem[]> {
  const max429Retries = 5;
  let lastError = "";
  const searchPart = search ? `&search=${encodeURIComponent(search)}` : "";

  for (let attempt = 1; attempt <= max429Retries; attempt++) {
    const res = await ubexFetch(`/api/v2/inventory?page=${page}${searchPart}`);
    const json = (await res.json()) as UbexInventoryListResponse;

    if (res.status === 429 && attempt < max429Retries) {
      await sleep(2000 * attempt);
      continue;
    }

    if (!res.ok) {
      lastError = `Ubex inventory list HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`;
      break;
    }
    if (!ubexJsonStatusOk(json.status)) {
      lastError = `Ubex inventory list error: ${json.msg ?? JSON.stringify(json).slice(0, 200)}`;
      break;
    }

    const out: UbexInventoryItem[] = [];
    for (const row of json.data ?? []) {
      const item = mapRow(row);
      if (item) out.push(item);
    }
    return out;
  }

  throw new Error(
    lastError ||
      `Ubex inventory list failed for page ${page}${search ? ` search=${search}` : ""}`,
  );
}

export function stockBalanceMaxItems(): number | null {
  const raw = process.env.STOCK_BALANCE_MAX_ITEMS?.trim();
  // Unset or 0 = load entire Ubex catalog (default).
  if (!raw || raw === "0") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Fetch Ubex inventory; paginates all pages when maxItems is null. Throttled to avoid 429. */
export async function fetchUbexInventoryAll(
  maxItems: number | null = stockBalanceMaxItems(),
): Promise<UbexInventoryItem[]> {
  const out: UbexInventoryItem[] = [];
  const parallel = inventoryPageParallel();
  const delayMs = inventoryPageDelayMs();
  let startPage = 1;

  while (maxItems === null || out.length < maxItems) {
    const pageNumbers = Array.from({ length: parallel }, (_, i) => startPage + i);
    const batches: UbexInventoryItem[][] = [];

    for (const page of pageNumbers) {
      if (delayMs > 0 && batches.length > 0) {
        await sleep(delayMs);
      }
      batches.push(await fetchUbexInventoryPage(page));
    }

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
    startPage += parallel;
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
  const batchDelay = Math.max(0, Number.parseInt(process.env.UBEX_INVENTORY_PAGE_DELAY_MS ?? "350", 10) || 350);
  for (let i = 0; i < unique.length; i += GET_STOCK_BATCH) {
    if (i > 0 && batchDelay > 0) await sleep(batchDelay);
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
