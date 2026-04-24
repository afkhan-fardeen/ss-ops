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
    pill: "bg-[#F7F7F7] text-[#555555] border border-[#EBEBEB]",
    dot: "bg-[#999999]",
  },
  accent: {
    pill: "bg-[#F7F7F7] text-[#111111] border border-[#111111]/20",
    dot: "bg-[#111111]",
  },
  green: {
    pill: "bg-[rgba(76,175,80,0.10)] text-[#4CAF50] border border-[#4CAF50]/20",
    dot: "bg-[#4CAF50]",
  },
  amber: {
    pill: "bg-[rgba(240,183,67,0.12)] text-[#F0B743] border border-[#F0B743]/20",
    dot: "bg-[#F0B743]",
  },
  red: {
    pill: "bg-[rgba(194,81,81,0.10)] text-[#C25151] border border-[#C25151]/20",
    dot: "bg-[#C25151]",
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
