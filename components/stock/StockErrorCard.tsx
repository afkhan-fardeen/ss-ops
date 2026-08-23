"use client";

import { Loader2, PackagePlus } from "lucide-react";
import { StatusPill, type StatusTone } from "@/components/portal/StatusPill";
import type { StockErrorCard as StockErrorCardData } from "@/lib/stock/load-stock-errors";
import type { RestockRowStatus } from "@/hooks/useRestockQueue";

function pillFor(card: StockErrorCardData): { tone: StatusTone; label: string } {
  switch (card.category) {
    case "unlinked":
      return { tone: "amber", label: "Unlinked" };
    case "ambiguous":
      return { tone: "red", label: "Ambiguous" };
    case "skipped":
      return { tone: "neutral", label: "Skipped" };
    case "store-b-not-listed":
      return { tone: "neutral", label: "Not on Store B" };
    case "sync-failed":
      return { tone: "red", label: "Sync failed" };
  }
}

function explanation(card: StockErrorCardData): { body: string; cause: string } {
  switch (card.category) {
    case "unlinked":
      return {
        body: "No Shopify variant found with this barcode in Store A or Store B.",
        cause:
          "Likely cause: the barcode may be missing, mistyped, or the product hasn't been added to Shopify yet.",
      };
    case "ambiguous": {
      const n = card.matchingVariants?.length ?? 0;
      const stores = Array.from(
        new Set((card.matchingVariants ?? []).map((v) => v.store)),
      );
      const storeLabel =
        stores.length === 1 ? `Store ${stores[0]}` : stores.length > 1 ? "both stores" : "Shopify";
      return {
        body: `This barcode matches ${n} different Shopify variant${n === 1 ? "" : "s"} in ${storeLabel}.`,
        cause:
          "Likely cause: the same barcode was entered on more than one product/variant by mistake.",
      };
    }
    case "skipped":
      if (card.skipReason === "not-tracking") {
        return {
          body: "Ubex isn't tracking quantity for this item, so it can't be compared.",
          cause: "Likely cause: quantity tracking is turned off on this Ubex inventory item.",
        };
      }
      return {
        body: "Ubex has no barcode recorded for this item.",
        cause: "Likely cause: a data-entry gap in Ubex — add a barcode before it can be synced.",
      };
    case "store-b-not-listed":
      return {
        body: "This barcode is listed on Store A but not on Store B.",
        cause:
          "Likely cause: the product hasn't been added to the Store B catalog, or its barcode is missing there.",
      };
    case "sync-failed":
      return {
        body: card.syncFailure?.message || "The last sync attempt for this barcode failed.",
        cause: "Likely cause: a Shopify/Ubex API error or rate limit — retrying often works.",
      };
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function StockErrorCard({
  card,
  restockStatus,
  onRetry,
}: {
  card: StockErrorCardData;
  restockStatus: RestockRowStatus;
  onRetry: () => void;
}) {
  const pill = pillFor(card);
  const copy = explanation(card);
  const busy = restockStatus === "busy";

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink">{card.productName}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            SKU {card.sku || "—"} · {card.barcode || "no barcode"}
          </p>
        </div>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
      </div>

      <div className="mt-3 border-t border-line pt-3 space-y-2">
        <p className="text-[13px] text-ink">{copy.body}</p>
        <p className="text-[12px] text-muted">{copy.cause}</p>

        {card.category === "ambiguous" && card.matchingVariants?.length ? (
          <p className="text-[12px] text-ink">
            Matches:{" "}
            {card.matchingVariants
              .map((v) => `${v.label} (Store ${v.store})`)
              .join(", ")}
          </p>
        ) : null}

        {card.category === "sync-failed" && card.syncFailure ? (
          <div className="space-y-2">
            <p className="text-[12px] text-muted">
              Attempted {formatWhen(card.syncFailure.attemptedAt)}
              {card.syncFailure.attemptedBy
                ? ` by ${card.syncFailure.attemptedBy}`
                : ""}
            </p>
            <p className="whitespace-pre-wrap break-words font-mono text-[12px] text-ink">
              {card.syncFailure.message}
            </p>
            <button
              type="button"
              disabled={busy || !card.barcode}
              onClick={onRetry}
              className="inline-flex min-h-11 items-center gap-2 rounded-card bg-stock px-4 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <PackagePlus size={15} />}
              Retry sync
            </button>
          </div>
        ) : null}

        {card.category !== "sync-failed" ? (
          <p className="font-mono text-[11px] text-muted">Ubex ID {card.ubexId}</p>
        ) : null}
      </div>
    </div>
  );
}
