import { getSupabaseService } from "@/lib/supabase/service";
import { loadStockBalanceCatalog } from "./load-stock-balance-preview";
import type { MatchingVariant, StockBalanceRow } from "./build-balance-rows";

export type StockErrorCategory =
  | "unlinked"
  | "ambiguous"
  | "skipped"
  | "store-b-not-listed"
  | "sync-failed";

export type StockErrorCard = {
  category: StockErrorCategory;
  ubexId: string;
  productName: string;
  sku: string;
  barcode: string;
  skipReason?: "no-barcode" | "not-tracking";
  matchingVariants?: MatchingVariant[];
  syncFailure?: {
    logId: string;
    attemptedAt: string;
    attemptedBy: string | null;
    message: string;
  };
};

export type StockErrorCounts = Record<StockErrorCategory | "all", number>;

type LogRow = {
  id: string;
  ubex_id: string;
  barcode: string;
  store_id: number | null;
  status: string;
  error: string | null;
  created_at: string;
  created_by: string | null;
};

function qualityCard(row: StockBalanceRow): StockErrorCard | null {
  if (row.status === "matched") return null;
  return {
    category: row.status,
    ubexId: row.ubexId,
    productName: row.productName,
    sku: row.sku,
    barcode: row.barcode,
    skipReason: row.skipReason,
    matchingVariants: row.matchingVariants,
  };
}

async function loadUnresolvedSyncFailures(
  catalogByBarcode: Map<string, StockBalanceRow>,
  catalogByUbexId: Map<string, StockBalanceRow>,
): Promise<StockErrorCard[]> {
  const supabase = getSupabaseService();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("stock_restock_log")
    .select("id, ubex_id, barcode, store_id, status, error, created_at, created_by")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const logs = (data ?? []) as LogRow[];
  const latestByPair = new Map<string, LogRow>();
  for (const log of logs) {
    const key = `${log.barcode.trim()}|${log.store_id === 2 ? 2 : 1}`;
    if (!latestByPair.has(key)) latestByPair.set(key, log);
  }

  const unresolved = [...latestByPair.values()].filter((l) => l.status === "error");

  const byBarcode = new Map<string, LogRow[]>();
  for (const log of unresolved) {
    const bc = log.barcode.trim();
    const list = byBarcode.get(bc) ?? [];
    list.push(log);
    byBarcode.set(bc, list);
  }

  const userIds = Array.from(
    new Set(unresolved.map((l) => l.created_by).filter((x): x is string => Boolean(x))),
  );
  const emailById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,email")
      .in("id", userIds);
    for (const p of (profiles ?? []) as { id: string; email: string }[]) {
      emailById.set(p.id, p.email);
    }
  }

  const cards: StockErrorCard[] = [];
  for (const [barcode, pairLogs] of byBarcode) {
    pairLogs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const newest = pairLogs[0]!;
    const catalog =
      catalogByBarcode.get(barcode) ?? catalogByUbexId.get(newest.ubex_id) ?? null;
    const storeBits = pairLogs
      .map((l) => (l.store_id === 2 ? "B" : "A"))
      .sort();
    const storePrefix =
      storeBits.length > 1 ? `Stores ${storeBits.join(" + ")}: ` : `Store ${storeBits[0]}: `;

    cards.push({
      category: "sync-failed",
      ubexId: catalog?.ubexId ?? newest.ubex_id,
      productName: catalog?.productName ?? newest.ubex_id,
      sku: catalog?.sku ?? "",
      barcode,
      syncFailure: {
        logId: newest.id,
        attemptedAt: newest.created_at,
        attemptedBy: newest.created_by
          ? emailById.get(newest.created_by) ?? newest.created_by
          : null,
        message: `${storePrefix}${newest.error || "Sync failed"}`,
      },
    });
  }
  return cards;
}

function emptyCounts(): StockErrorCounts {
  return {
    all: 0,
    unlinked: 0,
    ambiguous: 0,
    skipped: 0,
    "store-b-not-listed": 0,
    "sync-failed": 0,
  };
}

export async function loadStockErrors(): Promise<{
  cards: StockErrorCard[];
  counts: StockErrorCounts;
  fetchedAt: string;
  error: string | null;
}> {
  try {
    const catalog = await loadStockBalanceCatalog();
    const catalogByBarcode = new Map<string, StockBalanceRow>();
    const catalogByUbexId = new Map<string, StockBalanceRow>();
    for (const row of catalog.rows) {
      catalogByUbexId.set(row.ubexId, row);
      if (row.barcode) catalogByBarcode.set(row.barcode, row);
    }

    const quality = catalog.rows
      .map(qualityCard)
      .filter((c): c is StockErrorCard => c !== null);
    const failures = await loadUnresolvedSyncFailures(catalogByBarcode, catalogByUbexId);
    const cards = [...quality, ...failures];

    const counts = emptyCounts();
    for (const card of cards) {
      counts[card.category] += 1;
      counts.all += 1;
    }

    return { cards, counts, fetchedAt: catalog.fetchedAt, error: null };
  } catch (e) {
    return {
      cards: [],
      counts: emptyCounts(),
      fetchedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Failed to load stock errors",
    };
  }
}
