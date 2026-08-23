import type { StoreComparisonItem } from "@/lib/stock/record-mismatch-snapshot";

export function StoreComparisonList({
  items,
}: {
  items: StoreComparisonItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-[13px] text-muted">
        No shared SKUs with committed stock in the latest sweep.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item, i) => {
        const total = item.committedA + item.committedB;
        const aPct = total === 0 ? 50 : (item.committedA / total) * 100;
        return (
          <li key={item.barcode}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-[13px] font-medium text-ink">
                <span className="mr-1.5 font-mono text-[11px] text-muted">{i + 1}.</span>
                {item.productName}
              </p>
              <p className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                {item.barcode}
              </p>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-canvas">
              <div className="h-full bg-stock" style={{ width: `${aPct}%` }} />
              <div className="h-full bg-stock-b" style={{ width: `${100 - aPct}%` }} />
            </div>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-muted">
              <span className="text-stock">A {item.committedA}</span>
              {" · "}
              <span className="text-stock-b">B {item.committedB}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
