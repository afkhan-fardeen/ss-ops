type Tone = "primary" | "success" | "warning" | "danger";

const FILL: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/**
 * Accessible progress bar. Pass `value` (0–100) for determinate progress, or omit it for an indeterminate sweep.
 */
export function ProgressBar({
  value,
  tone = "primary",
  label,
  className = "",
}: {
  value?: number | null;
  tone?: Tone;
  label: string;
  className?: string;
}) {
  const determinate = typeof value === "number";
  const pct = determinate ? Math.max(0, Math.min(100, value)) : undefined;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-line/70 ${className}`}
    >
      {determinate ? (
        <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${FILL[tone]}`} style={{ width: `${pct}%` }} />
      ) : (
        <div className={`absolute inset-y-0 w-2/5 rounded-full animate-indeterminate ${FILL[tone]}`} />
      )}
    </div>
  );
}
