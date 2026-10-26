"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useUrlViewState } from "@/hooks/useUrlViewState";
import type { UbexPoolProduct } from "@/lib/ubex/group-balance-rows-by-name";
import { UbexProductDetail, UbexProductTile } from "./UbexProductCard";
import { UbexInventoryExportButton } from "./UbexInventoryExportButton";
import { btn } from "@/components/ui/button-styles";

type SearchResponse = {
  ok: boolean;
  error?: string;
  products?: UbexPoolProduct[];
  page?: number;
  hasNextPage?: boolean;
  store2Configured?: boolean;
  variantCount?: number;
};

export function UbexInventoryView() {
  const { searchParams, updateUrl } = useUrlViewState();
  const [initialSearch] = useState(() => searchParams.get("q") ?? "");
  const [query, setQuery] = useState(initialSearch);
  const [debounced, setDebounced] = useState(initialSearch);
  const [products, setProducts] = useState<UbexPoolProduct[]>([]);
  const [page, setPage] = useState(() =>
    Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1),
  );
  const [hasNextPage, setHasNextPage] = useState(false);
  const [store2Configured, setStore2Configured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // A search change always starts back at page 1 — skip the very first run (that's the
  // restored-from-URL value, not a user edit).
  const isFirstDebounce = useRef(true);
  useEffect(() => {
    if (isFirstDebounce.current) {
      isFirstDebounce.current = false;
      return;
    }
    updateUrl({ search: debounced, page: 1 });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const fetchPage = useCallback(async (q: string, targetPage: number) => {
    const params = new URLSearchParams({ page: String(targetPage) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/ubex-inventory/search?${params.toString()}`);
    const json = (await res.json()) as SearchResponse;
    if (!json.ok) {
      throw new Error(json.error ?? `Server returned ${res.status}`);
    }
    setHasNextPage(Boolean(json.hasNextPage));
    setStore2Configured(Boolean(json.store2Configured));
    setProducts(json.products ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveName(null);
    void fetchPage(debounced, page)
      .catch((e) => {
        if (!cancelled) {
          setProducts([]);
          setHasNextPage(false);
          setError(e instanceof Error ? e.message : "Failed to load Ubex inventory");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, page, fetchPage]);

  function goToPage(next: number) {
    if (next < 1) return;
    updateUrl({ page: next });
    setPage(next);
  }

  const variantCount = useMemo(
    () => products.reduce((sum, p) => sum + p.variantCount, 0),
    [products],
  );
  const active = products.find((p) => p.name === activeName) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-sm text-muted">
          {products.length} product{products.length === 1 ? "" : "s"} · {variantCount} variant
          {variantCount === 1 ? "" : "s"} on this page
        </p>
        <UbexInventoryExportButton />
      </div>

      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product, SKU, or barcode…"
          className="min-h-11 w-full rounded-card border border-line bg-white py-2 pl-9 pr-10 text-body text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {loading ? (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
          />
        ) : null}
      </div>

      {error ? (
        <div className="rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-body text-danger">
          {error}
        </div>
      ) : null}

      {!loading && products.length === 0 && !error ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-body text-muted shadow-soft">
          {debounced ? "No matching products." : "No Ubex inventory on this page."}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <UbexProductTile
            key={product.name}
            product={product}
            selected={activeName === product.name}
            store2Configured={store2Configured}
            onSelect={() =>
              setActiveName((cur) => (cur === product.name ? null : product.name))
            }
          />
        ))}
      </div>

      {active ? (
        <UbexProductDetail product={active} store2Configured={store2Configured} />
      ) : null}

      {(page > 1 || hasNextPage) && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => goToPage(page - 1)}
            aria-label="Previous page"
            className={btn("secondary", "sm")}
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <span className="px-2 text-body-sm text-muted">Page {page}</span>
          <button
            type="button"
            disabled={loading || !hasNextPage}
            onClick={() => goToPage(page + 1)}
            aria-label="Next page"
            className={btn("secondary", "sm")}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
