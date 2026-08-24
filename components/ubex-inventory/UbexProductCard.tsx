"use client";

import { STORE_LABELS } from "@/lib/stores/labels";
import type { UbexPoolProduct } from "@/lib/ubex/group-balance-rows-by-name";

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return String(n);
}

function variantMeta(size: string | null, color: string | null): string | null {
  const parts = [size, color].filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(" · ") : null;
}

export function UbexProductTile({
  product,
  selected,
  store2Configured,
  onSelect,
}: {
  product: UbexPoolProduct;
  selected: boolean;
  store2Configured: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "flex min-h-[200px] flex-col justify-between rounded-card border bg-white p-4 text-left shadow-soft transition",
        selected ? "border-ubex-inventory ring-2 ring-ubex-inventory/20" : "border-line hover:bg-canvas/40",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="line-clamp-2 font-medium text-ink">{product.name}</p>
        <p className="mt-0.5 text-[12px] text-muted">
          {product.variantCount} variant{product.variantCount === 1 ? "" : "s"}
        </p>
      </div>
      <dl className="mt-3 space-y-1 text-[12px]">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Ubex</dt>
          <dd className="font-mono tabular-nums text-ink">{product.totalStock}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="truncate text-muted">{STORE_LABELS[1]}</dt>
          <dd className="shrink-0 font-mono tabular-nums text-ink">{product.committedIntl} committed</dd>
        </div>
        {store2Configured ? (
          <div className="flex justify-between gap-2">
            <dt className="truncate text-muted">{STORE_LABELS[2]}</dt>
            <dd className="shrink-0 font-mono tabular-nums text-ink">{product.committedGcc} committed</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 border-t border-line pt-1">
          <dt className="text-ink">Available to sell</dt>
          <dd className="font-mono text-[15px] font-medium tabular-nums text-ink">
            {fmt(product.availableToSell)}
          </dd>
        </div>
      </dl>
    </button>
  );
}

export function UbexProductDetail({
  product,
  store2Configured,
}: {
  product: UbexPoolProduct;
  store2Configured: boolean;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft">
      <p className="font-medium text-ink">{product.name}</p>
      <p className="mt-0.5 text-[12px] text-muted">
        Ubex {product.totalStock} · {STORE_LABELS[1]} committed {product.committedIntl}
        {store2Configured ? ` · ${STORE_LABELS[2]} committed ${product.committedGcc}` : ""}
        {" · "}available to sell {fmt(product.availableToSell)}
      </p>
      {product.availableToSell === null ? (
        <p className="mt-2 text-[12px] text-muted">
          Available to sell is unknown when a variant is unlinked, ambiguous, or skipped.
        </p>
      ) : null}
      <ul className="mt-3 divide-y divide-line">
        {product.variants.map((v) => {
          const meta = variantMeta(v.size, v.color);
          return (
            <li key={v.ubexId} className="flex items-start justify-between gap-3 py-2 text-[13px]">
              <div className="min-w-0">
                <p className="text-ink">
                  <span className="font-mono">{v.barcode || "no barcode"}</span>
                  {meta ? <span className="text-muted"> · {meta}</span> : null}
                </p>
                {v.sku ? <p className="font-mono text-[11px] text-muted">SKU {v.sku}</p> : null}
                <p className="mt-0.5 text-[11px] text-muted">
                  {STORE_LABELS[1]} {fmt(v.committedIntl)}
                  {store2Configured ? ` · ${STORE_LABELS[2]} ${fmt(v.committedGcc)}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right font-mono tabular-nums">
                <p className="text-ink">Ubex {v.ubexStock}</p>
                <p className="text-[12px] text-muted">sell {fmt(v.availableToSell)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
