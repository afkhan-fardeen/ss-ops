import type { ReactNode } from "react";

export type StatusTone = "neutral" | "accent" | "green" | "amber" | "red";

type Props = {
  tone?: StatusTone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const toneStyles: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: {
    pill: "bg-canvas text-muted border border-line",
    dot: "bg-muted",
  },
  accent: {
    pill: "bg-primary-soft text-primary-strong border border-primary/20",
    dot: "bg-primary",
  },
  green: {
    pill: "bg-success-soft text-success border border-success/20",
    dot: "bg-success",
  },
  amber: {
    pill: "bg-warning-soft text-warning border border-warning/20",
    dot: "bg-warning",
  },
  red: {
    pill: "bg-danger-soft text-danger border border-danger/20",
    dot: "bg-danger",
  },
};

export function StatusPill({ tone = "neutral", dot = true, icon, children, className = "" }: Props) {
  const t = toneStyles[tone];
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-caption font-medium leading-5",
        t.pill,
        className,
      ].join(" ")}
    >
      {icon ? <span className="inline-flex h-3 w-3 items-center justify-center">{icon}</span> : null}
      {dot && !icon ? <span className={`inline-block h-2 w-2 rounded-full ${t.dot}`} /> : null}
      <span>{children}</span>
    </span>
  );
}
