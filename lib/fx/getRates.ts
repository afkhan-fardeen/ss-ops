import { readFxCache, writeFxCache } from "@/lib/supabase/fx-cache";
import {
  readMostRecentFxSnapshot,
  readTodayFxSnapshot,
  upsertTodayFxSnapshot,
} from "@/lib/supabase/fx-snapshot";

export type RatesResult = {
  rates: Record<string, number>;
  /** ISO timestamp when rates were obtained (live or cache time). */
  fetchedAt: string;
  source: "frankfurter" | "open_er" | "cache" | "supabase_today" | "supabase_recent";
  stale: boolean;
};

const GCC_DEFAULT = ["SAR", "AED", "KWD", "BHD", "QAR", "OMR"] as const;

let inMemory: { rates: Record<string, number>; fetchedAt: string } | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Frankfurter v2 — see https://www.frankfurter.app/
 */
async function fetchFrankfurter(currencies: string[]): Promise<Record<string, number> | null> {
  const dedup = [...new Set(currencies.filter(Boolean))].filter((c) => c !== "GBP");
  if (dedup.length === 0) return {};
  const quotes = dedup.join(",");
  const url = `https://api.frankfurter.dev/v2/rates?base=GBP&quotes=${encodeURIComponent(quotes)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return null;
    const out: Record<string, number> = {};
    for (const row of data as { quote?: string; rate?: number }[]) {
      if (row && typeof row.quote === "string" && typeof row.rate === "number") {
        out[row.quote] = row.rate;
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** exchangerate-api.com free tier via open.er-api.com */
async function fetchOpenEr(currencies: string[]): Promise<Record<string, number> | null> {
  const dedup = [...new Set(currencies.filter(Boolean))].filter((c) => c !== "GBP");
  if (dedup.length === 0) return {};
  const url = `https://open.er-api.com/v6/latest/GBP`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result === "error" || !data.rates) return null;
    const all = data.rates;
    const out: Record<string, number> = {};
    for (const c of dedup) {
      if (typeof all[c] === "number") out[c] = all[c]!;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function tryLive(currencies: string[]): Promise<RatesResult | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r1 = await fetchFrankfurter(currencies);
    if (r1 && Object.keys(r1).length) {
      const fetchedAt = new Date().toISOString();
      inMemory = { rates: r1, fetchedAt };
      await writeFxCache({ payload: r1, fetched_at: fetchedAt, source: "frankfurter" });
      await upsertTodayFxSnapshot({ rates: r1, source: "frankfurter" });
      return { rates: r1, fetchedAt, source: "frankfurter", stale: false };
    }
    const r2 = await fetchOpenEr(currencies);
    if (r2 && Object.keys(r2).length) {
      const fetchedAt = new Date().toISOString();
      inMemory = { rates: r2, fetchedAt };
      await writeFxCache({ payload: r2, fetched_at: fetchedAt, source: "open_er" });
      await upsertTodayFxSnapshot({ rates: r2, source: "open_er" });
      return { rates: r2, fetchedAt, source: "open_er", stale: false };
    }
    await sleep(200 * (attempt + 1));
  }
  return null;
}

function getInMemoryFallback(): RatesResult | null {
  if (!inMemory) return null;
  return {
    rates: inMemory.rates,
    fetchedAt: inMemory.fetchedAt,
    source: "cache",
    stale: true,
  };
}

/**
 * Returns GBP→currency rates. Fallback order:
 *   1. Live: Frankfurter → open.er-api (with retry)
 *   2. In-memory (current process)
 *   3. Supabase legacy `fx_rates_cache` row
 *   4. Supabase `fx_rate_snapshot` today row
 *   5. Supabase `fx_rate_snapshot` most-recent row
 */
export async function getRates(currencyCodes: string[]): Promise<RatesResult> {
  const want = [...new Set([...GCC_DEFAULT, ...currencyCodes])].filter((c) => c && c !== "GBP");

  const live = await tryLive(want);
  if (live) return live;

  const mem = getInMemoryFallback();
  if (mem) return mem;

  const cached = await readFxCache();
  if (cached?.payload && Object.keys(cached.payload).length) {
    inMemory = { rates: cached.payload, fetchedAt: cached.fetched_at };
    return {
      rates: cached.payload,
      fetchedAt: cached.fetched_at,
      source: "cache",
      stale: true,
    };
  }

  const today = await readTodayFxSnapshot();
  if (today) {
    inMemory = { rates: today.rates, fetchedAt: today.created_at };
    return {
      rates: today.rates,
      fetchedAt: today.created_at,
      source: "supabase_today",
      stale: true,
    };
  }

  const recent = await readMostRecentFxSnapshot();
  if (recent) {
    inMemory = { rates: recent.rates, fetchedAt: recent.created_at };
    return {
      rates: recent.rates,
      fetchedAt: recent.created_at,
      source: "supabase_recent",
      stale: true,
    };
  }

  throw new Error("FX rates unavailable (live, memory, cache, and snapshot all empty)");
}
