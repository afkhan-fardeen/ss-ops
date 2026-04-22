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
    <section className="animate-fade-up rounded-card border border-portal-border bg-portal-bg2 p-4 shadow-soft md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusPill tone={props.stale ? "amber" : "green"}>
            {props.stale ? "Cached" : "Live FX"}
          </StatusPill>
          <span className="text-[12px] text-portal-text2">Updated {formatTime(props.fetchedAt)}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-portal-text3">{props.source}</span>
      </div>
      <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {keys.map((ccy) => {
          const v = props.rates[ccy];
          if (typeof v !== "number") return null;
          return (
            <span
              key={ccy}
              className="snap-start whitespace-nowrap rounded-full border border-portal-border bg-portal-bg px-3 py-1 font-mono text-[12px] text-portal-text"
            >
              1 GBP = <span className="font-semibold">{v.toFixed(4)}</span> {ccy}
            </span>
          );
        })}
      </div>
    </section>
  );
}
