"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type {
  StockBalanceMode,
  StockBalancePreview,
} from "@/lib/stock/load-stock-balance-preview";

export const STOCK_BALANCE_TOAST_ID = "stock-balance-preview";

type LoadOptions = {
  search?: string;
  page?: number;
  /** Append rows to existing list (load more). */
  append?: boolean;
  silent?: boolean;
};

export type StockBalancePreviewContextValue = {
  preview: StockBalancePreview | null;
  loading: boolean;
  sweepLoading: boolean;
  error: string | null;
  search: string;
  mode: StockBalanceMode;
  /** Replace or append a page of browse/search results. */
  load: (opts?: LoadOptions) => Promise<void>;
  /** Reload current search at page 1 (browse mode only). */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  /** Restore cached sweep or fetch mismatches. */
  loadMismatches: (opts?: { force?: boolean }) => Promise<void>;
  /** Re-run the full catalog sweep. */
  refreshMismatches: () => Promise<void>;
  /** Leave sweep and load browse page 1. */
  exitSweep: () => Promise<void>;
};

export const StockBalancePreviewContext =
  createContext<StockBalancePreviewContextValue | null>(null);

type PreviewApiResponse = { ok: boolean; error?: string } & Partial<StockBalancePreview>;

function parsePreview(json: PreviewApiResponse): StockBalancePreview {
  if (
    !json.rows ||
    !json.location ||
    !json.fetchedAt ||
    json.itemCount === undefined ||
    !json.summary
  ) {
    throw new Error("Invalid stock balance preview response");
  }
  return {
    rows: json.rows,
    location: json.location,
    locationB: json.locationB ?? null,
    store2Configured: json.store2Configured ?? false,
    fetchedAt: json.fetchedAt,
    itemCount: json.itemCount,
    page: json.page ?? 1,
    hasNextPage: json.hasNextPage ?? false,
    search: json.search ?? "",
    mode: json.mode === "sweep" ? "sweep" : "browse",
    summary: json.summary,
  };
}

export function StockBalancePreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<StockBalancePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<StockBalanceMode>("browse");
  const sweepCacheRef = useRef<StockBalancePreview | null>(null);

  const load = useCallback(async (opts?: LoadOptions) => {
    const q = opts?.search ?? search;
    const page = opts?.page ?? 1;
    const append = opts?.append ?? false;
    const silent = opts?.silent ?? false;

    setMode("browse");
    setLoading(true);
    setError(null);
    if (opts?.search !== undefined) setSearch(opts.search);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (page > 1) params.set("page", String(page));
      const qs = params.toString();
      const res = await fetch(`/api/stock-balance/preview${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as PreviewApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      const next = parsePreview(json);
      setPreview((prev) => {
        if (!append || !prev || page <= 1 || prev.mode === "sweep") return next;
        const seen = new Set(prev.rows.map((r) => r.ubexId));
        const mergedRows = [...prev.rows];
        for (const row of next.rows) {
          if (!seen.has(row.ubexId)) mergedRows.push(row);
        }
        return {
          ...next,
          rows: mergedRows,
          itemCount: mergedRows.length,
          summary: {
            ...next.summary,
            mismatched: mergedRows.filter((r) => r.mismatch).length,
            matched: mergedRows.filter((r) => r.status === "matched").length,
            unlinked: mergedRows.filter((r) => r.status === "unlinked").length,
            ambiguous: mergedRows.filter((r) => r.status === "ambiguous").length,
            skipped: mergedRows.filter((r) => r.status === "skipped").length,
          },
        };
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load stock balance";
      setError(message);
      if (!silent) toast.error(message, { id: STOCK_BALANCE_TOAST_ID });
    } finally {
      setLoading(false);
    }
  }, [search]);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      await load({ search, page: 1, append: false, silent: opts?.silent });
    },
    [load, search],
  );

  const loadMismatches = useCallback(async (opts?: { force?: boolean }) => {
    const force = opts?.force ?? false;
    if (!force && sweepCacheRef.current) {
      setSearch("");
      setMode("sweep");
      setError(null);
      setPreview(sweepCacheRef.current);
      return;
    }

    setMode("sweep");
    setSearch("");
    setSweepLoading(true);
    setError(null);
    toast.loading("Finding all mismatches…", { id: STOCK_BALANCE_TOAST_ID });

    try {
      const res = await fetch("/api/stock-balance/mismatches", { cache: "no-store" });
      const json = (await res.json()) as PreviewApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const next = parsePreview(json);
      sweepCacheRef.current = next;
      setPreview(next);
      const n = next.rows.length;
      toast.success(
        `Mismatch sweep ready — ${n} mismatch${n === 1 ? "" : "es"}`,
        { id: STOCK_BALANCE_TOAST_ID, duration: 8_000 },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load mismatched stock";
      setError(message);
      toast.error(message, { id: STOCK_BALANCE_TOAST_ID });
      if (sweepCacheRef.current) {
        setPreview(sweepCacheRef.current);
        setMode("sweep");
      } else {
        setMode("browse");
      }
    } finally {
      setSweepLoading(false);
    }
  }, []);

  const refreshMismatches = useCallback(async () => {
    await loadMismatches({ force: true });
  }, [loadMismatches]);

  const exitSweep = useCallback(async () => {
    await load({ search: "", page: 1, append: false });
  }, [load]);

  const value = useMemo(
    () => ({
      preview,
      loading,
      sweepLoading,
      error,
      search,
      mode,
      load,
      refresh,
      loadMismatches,
      refreshMismatches,
      exitSweep,
    }),
    [
      preview,
      loading,
      sweepLoading,
      error,
      search,
      mode,
      load,
      refresh,
      loadMismatches,
      refreshMismatches,
      exitSweep,
    ],
  );

  return (
    <StockBalancePreviewContext.Provider value={value}>
      {children}
    </StockBalancePreviewContext.Provider>
  );
}
