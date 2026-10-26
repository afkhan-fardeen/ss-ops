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
    pill: "bg-canvas text-ink border border-ink/20",
    dot: "bg-ink",
  },
  green: {
    pill: "bg-[rgba(22,163,74,0.10)] text-[#16A34A] border border-[#16A34A]/20",
    dot: "bg-[#16A34A]",
  },
  amber: {
    pill: "bg-[rgba(217,119,6,0.12)] text-[#D97706] border border-[#D97706]/20",
    dot: "bg-[#D97706]",
  },
  red: {
    pill: "bg-[rgba(220,38,38,0.10)] text-[#DC2626] border border-[#DC2626]/20",
    dot: "bg-[#DC2626]",
  },
};

export function StatusPill({ tone = "neutral", dot = true, icon, children, className = "" }: Props) {
  const t = toneStyles[tone];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-fs11 font-medium leading-5",
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
