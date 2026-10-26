type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-soft md:p-4">
      <p className="text-caption font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
        {label}
      </p>
      <p className="mt-1 text-title font-medium leading-tight tabular-nums text-ink md:text-title">{value}</p>
      {hint ? <p className="mt-1 text-body-sm text-muted">{hint}</p> : null}
    </div>
  );
}
