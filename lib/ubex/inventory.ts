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
  data?: Array<{ id?: string; stock?: string | number }>;
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

function stockFromGetStockRow(row: {
  stock?: string | number;
  available_qty?: number;
}): number {
  if (row.stock !== undefined && row.stock !== null && row.stock !== "") {
    return parseStock(row.stock);
  }
  if (typeof row.available_qty === "number" && Number.isFinite(row.available_qty)) {
    return Math.max(0, Math.floor(row.available_qty));
  }
  return 0;
}

function mapRow(row: NonNullable<UbexInventoryListResponse["data"]>[number]): UbexInventoryItem | null {
  const id = row.id?.trim();
  if (!id) return null;
  return {
    id,
    name: (row.name ?? "").trim() || "—",
    barcode: (row.barcode ?? "").trim(),
    stock: parseStock(row.stock),
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

export function stockBalanceMaxItems(): number {
  return Math.max(1, Number.parseInt(process.env.STOCK_BALANCE_MAX_ITEMS ?? "20", 10) || 20);
}

/** Fetch up to maxItems from Ubex inventory (paginated). Read-only. */
export async function fetchUbexInventoryUpTo(maxItems = stockBalanceMaxItems()): Promise<UbexInventoryItem[]> {
  const out: UbexInventoryItem[] = [];
  let page = 1;
  while (out.length < maxItems) {
    const batch = await fetchUbexInventoryPage(page);
    if (batch.length === 0) break;
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    page++;
  }
  return out.slice(0, maxItems);
}

/** GET /api/v2/inventory/get-stock?ids[]=… — read-only fresh quantities for ids. */
export async function fetchUbexStockByIds(ids: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, number>();
  if (unique.length === 0) return out;

  const query = unique.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
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
    out.set(id, stockFromGetStockRow(row));
  }
  for (const row of json.data ?? []) {
    const id = row.id?.trim();
    if (!id || out.has(id)) continue;
    out.set(id, parseStock(row.stock));
  }
  return out;
}
