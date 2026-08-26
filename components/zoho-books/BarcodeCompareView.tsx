"use client";

import { useCallback, useMemo, useState } from "react";
import { GitCompare, Loader2, RefreshCw } from "lucide-react";
import type {
  BarcodeCompareRow,
  BarcodeCompareStatus,
  BarcodeCompareSummary,
} from "@/lib/zoho/compare-zoho-ubex-barcodes";
import type { ZohoErrorResult } from "@/lib/zoho/classify-error";
import { ZohoErrorBanner } from "./ZohoErrorDisplay";

type CompareError = {
  category: "not_configured" | "network" | "zoho" | "cache_empty";
  userMessage: string;
  detail: string;
  zohoError?: ZohoErrorResult;
};

type CompareResponse = {
  ok: boolean;
  error?: CompareError | string;
  rows?: BarcodeCompareRow[];
  summary?: BarcodeCompareSummary;
  fetchedAt?: string;
};

type RefreshResponse = {
  ok: boolean;
  error?: CompareError | string;
  count?: number;
  refreshedAt?: string;
  skippedNoBarcode?: number;
  duplicateBarcodes?: number;
};

type FilterId = "all" | "match" | "zoho_not_in_ubex" | "zoho_empty" | "ubex_only";

const FILTERS: { id: FilterId; label: string; match: (row: BarcodeCompareRow) => boolean }[] = [
  { id: "all", label: "All", match: (row) => !row.ubexOnly },
  { id: "match", label: "Match", match: (row) => row.status === "match" },
  {
    id: "zoho_not_in_ubex",
    label: "Not in Ubex",
    match: (row) => row.status === "zoho_not_in_ubex",
  },
  { id: "zoho_empty", label: "Zoho empty", match: (row) => row.status === "zoho_empty" },
  { id: "ubex_only", label: "Ubex only", match: (row) => row.status === "ubex_only" },
];

function statusLabel(status: BarcodeCompareStatus): string {
  switch (status) {
    case "match":
      return "Match";
    case "zoho_not_in_ubex":
      return "Not in Ubex";
    case "zoho_empty":
      return "Zoho empty";
    case "ubex_only":
      return "Ubex only";
  }
}

function statusClass(status: BarcodeCompareStatus): string {
  switch (status) {
    case "match":
      return "bg-green-50 text-green-800";
    case "zoho_not_in_ubex":
      return "bg-amber-50 text-amber-900";
    case "zoho_empty":
      return "bg-orange-50 text-orange-900";
    case "ubex_only":
      return "bg-slate-100 text-slate-700";
  }
}

function formatBarcode(value: string | null): string {
  if (!value) return "—";
  return value;
}

export function BarcodeCompareView() {
  const [rows, setRows] = useState<BarcodeCompareRow[]>([]);
  const [summary, setSummary] = useState<BarcodeCompareSummary | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [cacheHint, setCacheHint] = useState<{ count: number; refreshedAt: string | null } | null>(
    null,
  );
  const [comparing, setComparing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [pageError, setPageError] = useState<CompareError | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  const parseError = (json: CompareResponse | RefreshResponse, status: number): CompareError => {
    if (typeof json.error === "object" && json.error) return json.error;
    return {
      category: "network",
      userMessage: typeof json.error === "string" ? json.error : "Request failed.",
      detail: `HTTP ${status}`,
    };
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPageError(null);
    try {
      const res = await fetch("/api/zoho-books/ubex-catalog-refresh", { method: "POST" });
      let json: RefreshResponse;
      try {
        json = (await res.json()) as RefreshResponse;
      } catch {
        setPageError({
          category: "network",
          userMessage: "Refresh returned an unreadable response.",
          detail: `HTTP ${res.status}`,
        });
        return;
      }
      if (!json.ok) {
        setPageError(parseError(json, res.status));
        return;
      }
      setCacheHint({
        count: json.count ?? 0,
        refreshedAt: json.refreshedAt ?? null,
      });
    } catch (e) {
      setPageError({
        category: "network",
        userMessage:
          "Couldn't reach the server — this looks like a network or timeout issue. Try again.",
        detail: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const onCompare = useCallback(async () => {
    setComparing(true);
    setPageError(null);

    try {
      const res = await fetch("/api/zoho-books/barcode-compare");
      let json: CompareResponse;
      try {
        json = (await res.json()) as CompareResponse;
      } catch {
        setPageError({
          category: "network",
          userMessage: "Server returned an unreadable response.",
          detail: `HTTP ${res.status}`,
        });
        setRows([]);
        setSummary(null);
        setHasCompared(true);
        return;
      }

      if (!json.ok) {
        setPageError(parseError(json, res.status));
        setRows([]);
        setSummary(null);
        setHasCompared(true);
        return;
      }

      setRows(json.rows ?? []);
      setSummary(json.summary ?? null);
      setFetchedAt(json.fetchedAt ?? null);
      if (json.summary) {
        setCacheHint({
          count: json.summary.ubexCacheCount,
          refreshedAt: json.summary.cacheRefreshedAt,
        });
      }
      setHasCompared(true);
    } catch (e) {
      setPageError({
        category: "network",
        userMessage:
          "Couldn't reach the server — this looks like a network or timeout issue. Try again.",
        detail: e instanceof Error ? e.message : String(e),
      });
      setRows([]);
      setSummary(null);
      setHasCompared(true);
    } finally {
      setComparing(false);
    }
  }, []);

  const filteredRows = useMemo(() => {
    const filterFn = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!filterFn(row)) return false;
      if (!q) return true;
      return (
        row.sku.toLowerCase().includes(q) ||
        (row.zohoName?.toLowerCase().includes(q) ?? false) ||
        (row.ubexName?.toLowerCase().includes(q) ?? false) ||
        (row.zohoBarcode?.toLowerCase().includes(q) ?? false) ||
        (row.ubexBarcode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, filter, search]);

  const showResults = hasCompared && !pageError;
  const busy = comparing || refreshing;

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-white p-5 shadow-soft">
        <p className="text-[13px] text-muted">
          Match Zoho&apos;s Ubex Barcode field to Ubex barcodes from the saved catalog. Read-only —
          nothing is written. Refresh Ubex only when the warehouse catalog changes.
        </p>
        {cacheHint && (
          <p className="mt-2 text-[12px] text-muted">
            Ubex cache: {cacheHint.count.toLocaleString()} barcodes
            {cacheHint.refreshedAt
              ? ` · saved ${new Date(cacheHint.refreshedAt).toLocaleString()}`
              : ""}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {refreshing ? "Refreshing Ubex catalog… this can take several minutes" : "Refresh Ubex catalog"}
          </button>
          <button
            type="button"
            onClick={() => void onCompare()}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-zoho-books px-4 text-sm font-medium text-white shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {comparing ? <Loader2 size={16} className="animate-spin" /> : <GitCompare size={16} />}
            {comparing ? "Comparing Zoho barcodes to Ubex cache…" : "Compare barcodes"}
          </button>
        </div>
      </div>

      {pageError &&
        (pageError.category === "zoho" && pageError.zohoError ? (
          <ZohoErrorBanner error={pageError.zohoError} />
        ) : (
          <div className="rounded-card border border-amber-200 bg-amber-50/80 p-4 shadow-soft">
            <p className="text-sm font-medium text-ink">
              {pageError.category === "cache_empty" ? "Ubex catalog not saved yet" : "Compare failed"}
            </p>
            <p className="mt-1 text-[13px] text-muted">{pageError.userMessage}</p>
            <p className="mt-2 font-mono text-[11px] text-muted">{pageError.detail}</p>
          </div>
        ))}

      {showResults && summary && (
        <div className="rounded-card border border-line bg-white p-5 shadow-soft">
          <p className="text-[13px] text-muted">
            {summary.total} Zoho items · {summary.match} match · {summary.zohoNotInUbex} not in Ubex
            · {summary.zohoEmpty} Zoho empty · {summary.ubexOnly} Ubex only
            {fetchedAt && (
              <span className="ml-1 block text-[11px] sm:inline">
                · compared at {new Date(fetchedAt).toLocaleString()}
              </span>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  filter === f.id
                    ? "border-zoho-books bg-zoho-books-bg text-zoho-books"
                    : "border-line text-ink hover:bg-canvas"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, name, or barcode…"
              className="w-full max-w-md rounded-lg border border-line px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-zoho-books focus:outline-none focus:ring-1 focus:ring-zoho-books/30"
            />
          </div>

          {filteredRows.length === 0 ? (
            <p className="mt-6 text-[13px] text-muted">No rows match the current filter.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-medium uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Zoho name</th>
                    <th className="py-2 pr-3">Zoho barcode</th>
                    <th className="py-2 pr-3">Ubex name</th>
                    <th className="py-2 pr-3">Ubex barcode</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.ubexOnly ? "u" : "z"}-${row.zohoItemId ?? row.sku}-${row.ubexBarcode ?? ""}`}
                      className="text-ink"
                    >
                      <td className="py-2.5 pr-3 font-mono text-[12px]">{row.sku}</td>
                      <td className="max-w-[180px] truncate py-2.5 pr-3" title={row.zohoName ?? undefined}>
                        {row.zohoName ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[12px]">
                        {formatBarcode(row.zohoBarcode)}
                      </td>
                      <td className="max-w-[180px] truncate py-2.5 pr-3" title={row.ubexName ?? undefined}>
                        {row.ubexName ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[12px]">
                        {formatBarcode(row.ubexBarcode)}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${statusClass(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
