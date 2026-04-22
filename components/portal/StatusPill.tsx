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
    pill: "bg-portal-bg3 text-portal-text2 border border-portal-border",
    dot: "bg-portal-text3",
  },
  accent: {
    pill: "bg-portal-accentSoft text-portal-accent border border-portal-accent/20",
    dot: "bg-portal-accent",
  },
  green: {
    pill: "bg-portal-greenSoft text-portal-green border border-portal-green/20",
    dot: "bg-portal-green",
  },
  amber: {
    pill: "bg-portal-amberSoft text-portal-amber border border-portal-amber/20",
    dot: "bg-portal-amber",
  },
  red: {
    pill: "bg-portal-redSoft text-portal-red border border-portal-red/20",
    dot: "bg-portal-red",
  },
};

export function StatusPill({ tone = "neutral", dot = true, icon, children, className = "" }: Props) {
  const t = toneStyles[tone];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5",
        t.pill,
        className,
      ].join(" ")}
    >
      {icon ? <span className="inline-flex h-3 w-3 items-center justify-center">{icon}</span> : null}
      {dot && !icon ? <span className={`inline-block h-1.5 w-1.5 rounded-full ${t.dot}`} /> : null}
      <span>{children}</span>
    </span>
  );
}
