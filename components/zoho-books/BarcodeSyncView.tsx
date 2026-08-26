"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Loader2, ScanBarcode } from "lucide-react";
import type { BarcodeMatchCandidate, BarcodeMatchSummary } from "@/lib/zoho/match-barcode-candidates";
import type { ZohoErrorResult } from "@/lib/zoho/classify-error";
import { isPageLevelZohoError } from "@/lib/zoho/classify-error";
import { STORE_LABELS } from "@/lib/stores/labels";
import { ZohoErrorBanner, ZohoRowError } from "./ZohoErrorDisplay";

type ScanResponse = {
  ok: boolean;
  error?: ZohoErrorResult;
  candidates?: BarcodeMatchCandidate[];
  summary?: BarcodeMatchSummary;
  store2Configured?: boolean;
};

type FillResultRow = {
  itemId: string;
  ok: boolean;
  error?: ZohoErrorResult;
};

type FillResponse = {
  ok: boolean;
  error?: string | ZohoErrorResult;
  results?: FillResultRow[];
};

type RowFillState = {
  status: "success" | "error";
  error?: ZohoErrorResult;
};

export function BarcodeSyncView() {
  const [candidates, setCandidates] = useState<BarcodeMatchCandidate[]>([]);
  const [summary, setSummary] = useState<BarcodeMatchSummary | null>(null);
  const [store2Configured, setStore2Configured] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [filling, setFilling] = useState(false);
  const [pageError, setPageError] = useState<ZohoErrorResult | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [fillState, setFillState] = useState<Record<string, RowFillState>>({});

  const cleanCandidates = useMemo(
    () => candidates.filter((c) => c.status === "clean" && c.proposedBarcode),
    [candidates],
  );

  const selectedCount = useMemo(() => {
    let n = 0;
    for (const id of selected) {
      if (cleanCandidates.some((c) => c.zohoItemId === id)) n += 1;
    }
    return n;
  }, [selected, cleanCandidates]);

  const onScan = useCallback(async () => {
    setScanning(true);
    setPageError(null);
    setFillState({});
    setSelected(new Set());

    try {
      const res = await fetch("/api/zoho-books/barcode-candidates");
      let json: ScanResponse;
      try {
        json = (await res.json()) as ScanResponse;
      } catch {
        setPageError({
          category: "unknown",
          userMessage: "Server returned an unreadable response.",
          detail: `HTTP ${res.status}`,
          httpStatus: res.status,
        });
        setCandidates([]);
        setSummary(null);
        setHasScanned(true);
        return;
      }

      if (!json.ok) {
        const err = json.error ?? {
          category: "unknown" as const,
          userMessage: "Scan failed.",
          detail: `HTTP ${res.status}`,
          httpStatus: res.status,
        };
        if (isPageLevelZohoError(err.category)) {
          setPageError(err);
          setCandidates([]);
          setSummary(null);
        } else {
          setPageError(err);
        }
        setHasScanned(true);
        return;
      }

      setCandidates(json.candidates ?? []);
      setSummary(json.summary ?? null);
      setStore2Configured(Boolean(json.store2Configured));
      setHasScanned(true);
    } catch (e) {
      setPageError({
        category: "network",
        userMessage:
          "Couldn't reach Zoho — this looks like a network or timeout issue, not a data problem. Try again.",
        detail: e instanceof Error ? e.message : String(e),
      });
      setCandidates([]);
      setSummary(null);
      setHasScanned(true);
    } finally {
      setScanning(false);
    }
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllClean = () => {
    setSelected(new Set(cleanCandidates.map((c) => c.zohoItemId)));
  };

  const onFill = async () => {
    const ids = [...selected].filter((id) => cleanCandidates.some((c) => c.zohoItemId === id));
    if (ids.length === 0) return;

    setFilling(true);
    try {
      const res = await fetch("/api/zoho-books/barcode-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: ids }),
      });

      let json: FillResponse;
      try {
        json = (await res.json()) as FillResponse;
      } catch {
        setPageError({
          category: "unknown",
          userMessage: "Fill request returned an unreadable response.",
          detail: `HTTP ${res.status}`,
          httpStatus: res.status,
        });
        return;
      }

      if (!json.ok) {
        if (typeof json.error === "object" && json.error && "category" in json.error) {
          const err = json.error as ZohoErrorResult;
          if (isPageLevelZohoError(err.category)) {
            setPageError(err);
          }
        }
        return;
      }

      const next: Record<string, RowFillState> = { ...fillState };
      for (const row of json.results ?? []) {
        if (row.ok) {
          next[row.itemId] = { status: "success" };
          setSelected((prev) => {
            const s = new Set(prev);
            s.delete(row.itemId);
            return s;
          });
        } else if (row.error) {
          next[row.itemId] = { status: "error", error: row.error };
        }
      }
      setFillState(next);
    } catch (e) {
      setPageError({
        category: "network",
        userMessage:
          "Couldn't reach Zoho — this looks like a network or timeout issue, not a data problem. Try again.",
        detail: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setFilling(false);
    }
  };

  const showResults = hasScanned && !pageError;

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-white p-5 shadow-soft">
        <p className="text-[13px] text-muted">
          Fill the &quot;Ubex Barcode&quot; field on Zoho items using matching Shopify SKUs. Nothing
          is written until you click Fill selected.
        </p>
        <button
          type="button"
          onClick={() => void onScan()}
          disabled={scanning || filling}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-zoho-books px-4 text-sm font-medium text-white shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <ScanBarcode size={16} />}
          {scanning ? "Scanning…" : "Scan for items to fill"}
        </button>
      </div>

      {pageError && <ZohoErrorBanner error={pageError} />}

      {showResults && summary && (
        <div className="rounded-card border border-line bg-white p-5 shadow-soft">
          <p className="text-[13px] text-muted">
            Found {summary.total} items · {summary.clean} clean · {summary.conflict} conflicts ·{" "}
            {summary.noMatch} no match
            {!store2Configured && (
              <span className="ml-1">({STORE_LABELS[2]} not configured — matching store 1 only)</span>
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={selectAllClean}
              disabled={cleanCandidates.length === 0 || filling}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-canvas disabled:opacity-50"
            >
              Select all clean matches
            </button>
            <button
              type="button"
              onClick={() => void onFill()}
              disabled={selectedCount === 0 || filling || scanning}
              className="inline-flex items-center gap-2 rounded-lg bg-zoho-books px-4 py-1.5 text-[12px] font-medium text-white shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              {filling && <Loader2 size={14} className="animate-spin" />}
              Fill selected ({selectedCount})
            </button>
          </div>

          {candidates.length === 0 ? (
            <p className="mt-6 text-[13px] text-muted">No Zoho items need a barcode fill right now.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {candidates.map((row) => {
                const isClean = row.status === "clean" && row.proposedBarcode;
                const checked = selected.has(row.zohoItemId);
                const filled = fillState[row.zohoItemId];

                return (
                  <li key={row.zohoItemId} className="flex gap-3 py-3 text-[13px]">
                    <div className="pt-0.5">
                      {isClean ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={filling || filled?.status === "success"}
                          onChange={() => toggleSelect(row.zohoItemId)}
                          className="h-4 w-4 rounded border-line text-zoho-books focus:ring-zoho-books/40"
                        />
                      ) : (
                        <span className="inline-block h-4 w-4" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <span className="font-medium text-ink">{row.zohoName}</span>
                          <span className="ml-2 font-mono text-[11px] text-muted">
                            SKU {row.zohoSku}
                          </span>
                        </div>
                        {filled?.status === "success" && (
                          <span className="inline-flex items-center gap-1 text-[12px] text-green-700">
                            <Check size={14} /> Filled
                          </span>
                        )}
                      </div>

                      {row.status === "clean" && row.proposedBarcode && !filled && (
                        <p className="mt-0.5 font-mono text-[12px] text-zoho-books">
                          → {row.proposedBarcode}
                        </p>
                      )}

                      {row.status === "conflict" && (
                        <p className="mt-1 text-[12px] text-amber-800">
                          {STORE_LABELS[1]} / {STORE_LABELS[2]} disagree:{" "}
                          <span className="font-mono">{row.storeABarcode ?? "—"}</span>
                          {" / "}
                          <span className="font-mono">{row.storeBBarcode ?? "—"}</span>
                        </p>
                      )}

                      {row.status === "no-match" && (
                        <p className="mt-1 text-[12px] text-amber-800">No Shopify match for this SKU</p>
                      )}

                      {filled?.status === "error" && filled.error && (
                        <ZohoRowError error={filled.error} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
