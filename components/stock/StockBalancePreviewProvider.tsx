"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { StockBalancePreview } from "@/lib/stock/load-stock-balance-preview";

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
  error: string | null;
  search: string;
  /** Replace or append a page of results. */
  load: (opts?: LoadOptions) => Promise<void>;
  /** Reload current search at page 1. */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
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
    summary: json.summary,
  };
}

export function StockBalancePreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<StockBalancePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (opts?: LoadOptions) => {
    const q = opts?.search ?? search;
    const page = opts?.page ?? 1;
    const append = opts?.append ?? false;
    const silent = opts?.silent ?? false;

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
        if (!append || !prev || page <= 1) return next;
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

  const value = useMemo(
    () => ({ preview, loading, error, search, load, refresh }),
    [preview, loading, error, search, load, refresh],
  );

  return (
    <StockBalancePreviewContext.Provider value={value}>
      {children}
    </StockBalancePreviewContext.Provider>
  );
}
