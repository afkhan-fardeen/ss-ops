"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { groupUbexItemsByName, type UbexProductGroup } from "@/lib/ubex/group-by-name";
import type { UbexInventoryItem } from "@/lib/ubex/inventory";
import { UbexProductCard } from "./UbexProductCard";

type SearchResponse = {
  ok: boolean;
  error?: string;
  products?: UbexProductGroup[];
  page?: number;
  hasNextPage?: boolean;
  itemCount?: number;
  variantCount?: number;
};

function flattenVariants(products: UbexProductGroup[]): UbexInventoryItem[] {
  return products.flatMap((p) => p.variants);
}

export function UbexInventoryView() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [products, setProducts] = useState<UbexProductGroup[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(async (q: string, nextPage: number, append: boolean) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/ubex-inventory/search?${params.toString()}`);
    const json = (await res.json()) as SearchResponse;
    if (!json.ok) {
      throw new Error(json.error ?? `Server returned ${res.status}`);
    }
    const incoming = json.products ?? [];
    setHasNextPage(Boolean(json.hasNextPage));
    setPage(nextPage);
    setProducts((prev) => {
      if (!append) return incoming;
      const merged = flattenVariants(prev).concat(flattenVariants(incoming));
      return groupUbexItemsByName(merged);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(new Set());
    void fetchPage(debounced, 1, false)
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
  }, [debounced, fetchPage]);

  const onLoadMore = async () => {
    setLoadMoreLoading(true);
    setError(null);
    try {
      await fetchPage(debounced, page + 1, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadMoreLoading(false);
    }
  };

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const variantCount = useMemo(
    () => products.reduce((sum, p) => sum + p.variantCount, 0),
    [products],
  );

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted">
        {products.length} product{products.length === 1 ? "" : "s"} · {variantCount} variant
        {variantCount === 1 ? "" : "s"} loaded
      </p>

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
          className="min-h-11 w-full rounded-card border border-line bg-white py-2 pl-9 pr-10 text-[13px] text-ink placeholder:text-muted focus:border-ubex-inventory focus:outline-none focus:ring-2 focus:ring-ubex-inventory/20"
        />
        {loading ? (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted"
          />
        ) : null}
      </div>

      {error ? (
        <div className="rounded-card border border-[#C25151]/30 bg-[rgba(194,81,81,0.08)] px-4 py-3 text-[13px] text-[#C25151]">
          {error}
        </div>
      ) : null}

      {!loading && products.length === 0 && !error ? (
        <p className="rounded-card border border-line bg-white px-4 py-10 text-center text-[13px] text-muted shadow-soft">
          {debounced ? "No matching products." : "No Ubex inventory on this page."}
        </p>
      ) : null}

      <div className="space-y-2">
        {products.map((product) => (
          <UbexProductCard
            key={product.name}
            product={product}
            expanded={expanded.has(product.name)}
            onToggle={() => toggle(product.name)}
          />
        ))}
      </div>

      {hasNextPage ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            disabled={loadMoreLoading || loading}
            onClick={() => void onLoadMore()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-card border border-line bg-white px-3 text-[12px] font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
          >
            {loadMoreLoading ? <Loader2 size={13} className="animate-spin" /> : null}
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
