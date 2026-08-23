"use client";

import { ChevronDown } from "lucide-react";
import type { UbexProductGroup } from "@/lib/ubex/group-by-name";

function variantMeta(size: string | null, color: string | null): string | null {
  const parts = [size, color].filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(" · ") : null;
}

export function UbexProductCard({
  product,
  expanded,
  onToggle,
}: {
  product: UbexProductGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-card border border-line bg-white shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="font-medium text-ink">{product.name}</p>
          <p className="mt-0.5 text-[12px] text-muted">
            {product.variantCount} variant{product.variantCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[13px] tabular-nums text-ink">
            {product.totalStock} in stock
          </span>
          <ChevronDown
            size={16}
            className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 border-t border-line px-4 py-3">
            {product.variants.map((v) => {
              const meta = variantMeta(v.size, v.color);
              return (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-3 py-1 text-[13px]"
                >
                  <div className="min-w-0">
                    <p className="text-ink">
                      <span className="font-mono">{v.barcode || "no barcode"}</span>
                      {meta ? <span className="text-muted"> · {meta}</span> : null}
                    </p>
                    {v.sku ? (
                      <p className="font-mono text-[11px] text-muted">SKU {v.sku}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-mono tabular-nums text-ink">{v.stock}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
