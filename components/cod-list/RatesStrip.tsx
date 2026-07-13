import { StatusPill } from "@/components/portal/StatusPill";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function RatesStrip(props: {
  rates: Record<string, number>;
  fetchedAt: string;
  stale: boolean;
  source: string;
}) {
  const keys = Object.keys(props.rates).sort();
  return (
    <section className="flex h-full min-h-0 animate-fade-up flex-col rounded-card border border-line bg-white p-4 shadow-soft md:p-5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusPill tone={props.stale ? "amber" : "green"}>
            {props.stale ? "Cached" : "Live FX"}
          </StatusPill>
          <span className="text-[12px] text-muted">
            Updated <span className="font-mono">{formatTime(props.fetchedAt)}</span>
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{props.source}</span>
      </div>
      <div className="-mx-1 mt-3 flex min-h-0 flex-1 snap-x gap-2 overflow-x-auto overflow-y-auto px-1 pb-1 sm:flex-wrap sm:content-start sm:overflow-visible">
        {keys.map((ccy) => {
          const v = props.rates[ccy];
          if (typeof v !== "number") return null;
          return (
            <span
              key={ccy}
              className="snap-start whitespace-nowrap rounded-full border border-line bg-white px-3 py-1 font-mono text-[12px] text-ink"
            >
              1 GBP = <span className="font-medium">{v.toFixed(4)}</span> {ccy}
            </span>
          );
        })}
      </div>
    </section>
  );
}
