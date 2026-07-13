export function TableSkeleton({
  rows = 8,
  columns = 7,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {showHeader ? (
        <div
          className="grid gap-4 border-b border-line bg-canvas px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-line" />
          ))}
        </div>
      ) : null}
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-3 animate-pulse rounded bg-line"
                style={{ animationDelay: `${(r * columns + c) * 20}ms`, width: `${60 + ((r + c) % 5) * 8}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FilterChipSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-7 animate-pulse rounded-full bg-line"
          style={{ width: `${56 + (i % 3) * 18}px` }}
        />
      ))}
    </div>
  );
}

export function StripSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-4 py-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-5 animate-pulse rounded bg-line"
          style={{ width: `${72 + (i % 3) * 24}px` }}
        />
      ))}
    </div>
  );
}
