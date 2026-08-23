"use client";

import { useEffect, useState } from "react";

type SalesWindow = "7" | "30" | "90" | "all-time";

type ProductResponse = {
  ok: boolean;
  found?: boolean;
  error?: string;
  product?: {
    productName: string;
    sku: string;
    barcode: string;
    ubexStock: number;
    storeA: { onHand: number | null; available: number | null; committed: number | null };
    storeB: { onHand: number | null; available: number | null; committed: number | null } | null;
    commitment: {
      totalCommitted: number;
      canBeSent: number;
      shortBy: number;
      trulyAvailable: number;
    };
    sales: {
      window: SalesWindow;
      unitsSold: number;
      storeA: number;
      storeB: number;
      rank: number | null;
    };
  };
};

const WINDOW_OPTIONS: { value: SalesWindow; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all-time", label: "All time" },
];

export function ProductSearchCard() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [window, setWindow] = useState<SalesWindow>("30");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProductResponse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetch(`/api/stock-analysis/product?search=${encodeURIComponent(debounced)}&window=${window}`)
      .then(async (res) => res.json() as Promise<ProductResponse>)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ ok: false, error: "Failed to load product" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, window]);

  const product = data?.product;

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft">
      <h2 className="text-[13px] font-medium text-ink">Search product</h2>
      <p className="mt-0.5 text-[12px] text-muted">Name, SKU, or barcode — read-only inventory and sales</p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="mt-3 w-full rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-stock-analysis"
      />

      {loading ? (
        <p className="mt-4 text-[13px] text-muted">Loading…</p>
      ) : null}

      {!loading && debounced && data?.ok && !data.found ? (
        <p className="mt-4 text-[13px] text-muted">No matching product.</p>
      ) : null}

      {!loading && data?.error ? (
        <p className="mt-4 text-[13px] text-[#C25151]">{data.error}</p>
      ) : null}

      {product ? (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <div>
            <p className="text-[14px] font-medium text-ink">{product.productName}</p>
            <p className="mt-0.5 font-mono text-[12px] text-muted">
              SKU {product.sku} · barcode {product.barcode}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Inventory</p>
            <dl className="mt-2 space-y-1 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Ubex stock</dt>
                <dd className="font-mono tabular-nums text-ink">{product.ubexStock}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Store A</dt>
                <dd className="font-mono tabular-nums text-ink">
                  on hand {product.storeA.onHand ?? "—"} · available {product.storeA.available ?? "—"} ·
                  committed {product.storeA.committed ?? "—"}
                </dd>
              </div>
              {product.storeB ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Store B</dt>
                  <dd className="font-mono tabular-nums text-ink">
                    on hand {product.storeB.onHand ?? "—"} · available {product.storeB.available ?? "—"} ·
                    committed {product.storeB.committed ?? "—"}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Total committed</dt>
                <dd className="font-mono tabular-nums text-ink">{product.commitment.totalCommitted}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Can be sent now</dt>
                <dd
                  className={`font-mono tabular-nums ${
                    product.commitment.shortBy > 0 ? "text-[#C25151]" : "text-ink"
                  }`}
                >
                  {product.commitment.canBeSent}
                  {product.commitment.shortBy > 0
                    ? ` · ${product.commitment.shortBy} short — not enough Ubex stock`
                    : " · fully covered"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Truly available</dt>
                <dd className="font-mono tabular-nums text-ink">{product.commitment.trulyAvailable}</dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Sales</p>
              <select
                value={window}
                onChange={(e) => setWindow(e.target.value as SalesWindow)}
                className="rounded-md border border-line bg-canvas px-2 py-1 text-[12px] text-ink"
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <dl className="mt-2 space-y-1 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Units sold</dt>
                <dd className="font-mono tabular-nums text-ink">{product.sales.unitsSold}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">By store</dt>
                <dd className="font-mono tabular-nums text-ink">
                  A {product.sales.storeA} · B {product.sales.storeB}
                </dd>
              </div>
              {product.sales.rank != null ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Rank</dt>
                  <dd className="text-ink">#{product.sales.rank} best-seller</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}
