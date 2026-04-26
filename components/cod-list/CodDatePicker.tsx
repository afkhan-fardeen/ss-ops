"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type CodDateOption = {
  dateKey: string;
  label: string;
  isToday: boolean;
};

/**
 * Cherry-pick up to 14 collection close dates. URL: `?dates=YYYY-MM-DD,…` (sorted).
 * When only one key equals “today’s” window, URL may be omitted; server defaults match.
 */
export function CodDatePicker({ options, selectedDateKeys }: { options: CodDateOption[]; selectedDateKeys: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyKeys = useCallback(
    (next: string[]) => {
      const sorted = [...new Set(next)].filter(Boolean).sort();
      if (sorted.length === 0) return;
      const sp = new URLSearchParams(searchParams.toString());
      if (sorted.length === 1) {
        sp.set("dates", sorted[0]!);
      } else {
        sp.set("dates", sorted.join(","));
      }
      const q = sp.toString();
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function toggle(key: string) {
    const set = new Set(selectedDateKeys);
    if (set.has(key)) {
      if (set.size <= 1) return;
      set.delete(key);
    } else {
      if (set.size >= 14) return;
      set.add(key);
    }
    applyKeys([...set]);
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Select collection days (Bahrain 14:00 to 14:00)"
    >
      {options.map((o) => {
        const on = selectedDateKeys.includes(o.dateKey);
        return (
          <button
            key={o.dateKey}
            type="button"
            onClick={() => void toggle(o.dateKey)}
            className={[
              "focus-ring inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11.5px] font-medium transition",
              on
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[#EBEBEB] bg-white text-[#555555] hover:border-[#CCCCCC] hover:text-[#111111]",
            ].join(" ")}
            aria-pressed={on}
          >
            {o.isToday ? (
              <span
                className={[
                  "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                  on ? "bg-emerald-400" : "bg-[#4CAF50]",
                ].join(" ")}
                title="Current collection window"
              />
            ) : null}
            <span className="min-w-0 truncate tabular-nums">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
