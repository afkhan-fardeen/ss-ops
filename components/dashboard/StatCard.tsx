type Props = {
  label: string;
  value: string;
  hint?: string;
  /** Optional left-border colour class, e.g. "border-l-orders-solid". */
  accentClass?: string;
};

export function StatCard({ label, value, hint, accentClass }: Props) {
  return (
    <div
      className={`rounded-card border border-line bg-white p-3.5 shadow-soft md:p-4 ${accentClass ? `border-l-4 ${accentClass}` : ""}`}
    >
      <p className="text-caption font-semibold uppercase tracking-wide max-md:normal-case max-md:tracking-normal text-muted">
        {label}
      </p>
      <p className="mt-1 text-title font-semibold leading-tight tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-body-sm text-muted">{hint}</p> : null}
    </div>
  );
}
