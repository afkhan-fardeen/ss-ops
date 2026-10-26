type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-card border border-line bg-white p-3.5 shadow-soft md:p-4">
      <p className="text-fs11 font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-[20px] font-medium leading-tight tabular-nums text-ink md:text-[18px]">{value}</p>
      {hint ? <p className="mt-1 text-fs12 text-muted">{hint}</p> : null}
    </div>
  );
}
