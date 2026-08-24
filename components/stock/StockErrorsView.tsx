"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { spring } from "@/lib/motion";
import { STORE_LABELS } from "@/lib/stores/labels";
import { useRestockQueue } from "@/hooks/useRestockQueue";
import { useStockErrorsCount } from "@/components/stock/StockErrorsCountProvider";
import { StockErrorCard } from "@/components/stock/StockErrorCard";
import type {
  StockErrorCard as StockErrorCardData,
  StockErrorCategory,
  StockErrorCounts,
} from "@/lib/stock/load-stock-errors";

type TabId = "all" | StockErrorCategory;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "unlinked", label: "Unlinked" },
  { id: "ambiguous", label: "Ambiguous" },
  { id: "skipped", label: "Skipped" },
  { id: "store-b-not-listed", label: `${STORE_LABELS[2]} not listed` },
  { id: "sync-failed", label: "Sync failures" },
];

type ApiResponse = {
  ok: boolean;
  error?: string;
  cards?: StockErrorCardData[];
  counts?: StockErrorCounts;
  fetchedAt?: string;
};

export function StockErrorsView() {
  const { restockOne, state } = useRestockQueue();
  const countCtx = useStockErrorsCount();
  const [tab, setTab] = useState<TabId>("all");
  const [cards, setCards] = useState<StockErrorCardData[] | null>(null);
  const [counts, setCounts] = useState<StockErrorCounts | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    toast.loading("Finding stock errors…", { id: "stock-balance-errors" });
    try {
      const res = await fetch("/api/stock-balance/errors", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || !json.ok || !json.cards || !json.counts) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setCards(json.cards);
      setCounts(json.counts);
      setFetchedAt(json.fetchedAt ?? new Date().toISOString());
      countCtx?.setCount(json.counts.all);
      const n = json.counts.all;
      toast.success(
        `Stock errors ready — ${n} issue${n === 1 ? "" : "s"}`,
        { id: "stock-balance-errors", duration: 8_000 },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load errors";
      setError(message);
      toast.error(message, { id: "stock-balance-errors" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // First load only — refresh is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (!cards) return [];
    if (tab === "all") return cards;
    return cards.filter((c) => c.category === tab);
  }, [cards, tab]);

  if (loading && !cards) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-white py-16 shadow-soft">
        <Loader2 size={28} className="animate-spin-slow text-muted" />
        <p className="text-[13px] font-medium text-ink">Finding stock errors…</p>
        <p className="max-w-sm text-center text-[12px] text-muted">
          Fetching products from Ubex and matching Shopify by barcode. Large catalogs may take
          a minute — Ubex limits how fast we can page inventory. You can leave this page; you
          will get a notification when the refresh finishes.
        </p>
      </div>
    );
  }

  if (error && !cards) {
    return (
      <div className="space-y-3">
        <div className="rounded-card border border-[#C25151]/30 bg-[rgba(194,81,81,0.08)] px-4 py-3 text-[13px] text-[#C25151]">
          {error}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="focus-ring rounded-card border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-canvas"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cards || !counts) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line border-l-4 border-l-stock bg-white p-4 shadow-soft">
        <p className="text-[13px] font-medium text-ink">
          {counts.all} issue{counts.all === 1 ? "" : "s"} need attention · {counts["sync-failed"]}{" "}
          sync failure{counts["sync-failed"] === 1 ? "" : "s"}
        </p>
        {fetchedAt ? (
          <p className="mt-1 text-[12px] text-muted">
            Fetched {new Date(fetchedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-canvas p-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            const n = counts[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "relative inline-flex min-h-9 items-center rounded-md px-3 text-[12px] font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {active ? (
                  <motion.span
                    layoutId="stock-error-tab"
                    transition={spring}
                    className="absolute inset-0 rounded-md bg-white shadow-soft"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-10">
                  {t.label} ({n})
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-card border border-line bg-white px-3 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-[13px] text-muted shadow-soft">
          No issues in this category.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((card) => (
            <StockErrorCard
              key={`${card.category}-${card.ubexId}-${card.syncFailure?.logId ?? card.barcode}`}
              card={card}
              restockStatus={state[card.ubexId]?.status ?? "idle"}
              onRetry={() =>
                void restockOne({
                  ubexId: card.ubexId,
                  barcode: card.barcode,
                  productName: card.productName,
                  ubexStock: 0,
                  shopifyOnHand: null,
                  shopifyAvailable: null,
                  shopifyCommitted: null,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
