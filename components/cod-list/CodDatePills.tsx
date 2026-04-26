"use client";

import Link from "next/link";

export type CodDatePill = {
  dateKey: string;
  href: string;
  label: string;
  isToday: boolean;
  isActive: boolean;
};

/**
 * Last N collection days as links (?date= or /cod-list for current window).
 */
export function CodDatePills({ pills }: { pills: CodDatePill[] }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="tablist"
      aria-label="Collection window by close date"
    >
      {pills.map((p) => (
        <Link
          key={p.dateKey}
          href={p.href}
          role="tab"
          aria-selected={p.isActive}
          scroll={false}
          className={[
            "focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11.5px] font-medium transition",
            p.isActive
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-[#EBEBEB] bg-white text-[#555555] hover:border-[#CCCCCC] hover:text-[#111111]",
          ].join(" ")}
        >
          {p.isToday ? (
            <span
              className={[
                "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                p.isActive ? "bg-emerald-400 animate-pulse-dot" : "bg-[#4CAF50] animate-pulse-dot",
              ].join(" ")}
              title="Current window"
            />
          ) : null}
          <span className="tabular-nums">{p.label}</span>
        </Link>
      ))}
    </div>
  );
}
