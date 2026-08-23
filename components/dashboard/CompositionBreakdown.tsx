export type CompositionSegment = {
  label: string;
  count: number;
};

export function CompositionBreakdown({
  segments,
  emptyMessage = "No snapshot yet.",
}: {
  segments: CompositionSegment[];
  emptyMessage?: string;
}) {
  const max = Math.max(0, ...segments.map((s) => s.count));

  if (segments.every((s) => s.count === 0)) {
    return <p className="text-[13px] text-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {segments.map((seg) => {
        const width = max === 0 ? 0 : Math.max(4, (seg.count / max) * 100);
        return (
          <li key={seg.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
              <span className="text-muted">{seg.label}</span>
              <span className="font-mono tabular-nums text-ink">{seg.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-stock-analysis"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
