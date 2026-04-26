"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, CalendarRange } from "lucide-react";

export type CodDateOption = {
  dateKey: string;
  label: string;
  isToday: boolean;
};

const MAX_DAYS = 14;
const DEBOUNCE_MS = 250;

/**
 * Multi-select for up to 14 collection close dates. URL: `?dates=YYYY-MM-DD,…` (sorted after apply).
 * Popover + grid; debounced `router.push` in a transition.
 */
export function CodDatePicker({ options, selectedDateKeys }: { options: CodDateOption[]; selectedDateKeys: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [localKeys, setLocalKeys] = useState<string[]>(selectedDateKeys);
  const [isPending, startTransition] = useTransition();
  const popRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalKeys(selectedDateKeys);
  }, [selectedDateKeys]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const pushKeys = useCallback(
    (sorted: string[]) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (sorted.length === 1) {
        sp.set("dates", sorted[0]!);
      } else {
        sp.set("dates", sorted.join(","));
      }
      const q = sp.toString();
      startTransition(() => {
        router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const schedulePush = useCallback(
    (next: string[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const sorted = [...new Set(next)].filter(Boolean).sort();
        if (sorted.length === 0) return;
        pushKeys(sorted);
      }, DEBOUNCE_MS);
    },
    [pushKeys],
  );

  function toggle(key: string) {
    const set = new Set(localKeys);
    if (set.has(key)) {
      if (set.size <= 1) return;
      set.delete(key);
    } else {
      if (set.size >= MAX_DAYS) return;
      set.add(key);
    }
    const next = [...set].sort();
    setLocalKeys(next);
    schedulePush(next);
  }

  const singleLabel = localKeys.length === 1 ? options.find((o) => o.dateKey === localKeys[0])?.label : null;
  const triggerLabel = singleLabel ?? `${localKeys.length} day${localKeys.length === 1 ? "" : "s"} selected`;

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "focus-ring inline-flex w-full min-w-0 max-w-md items-center justify-between gap-2 rounded-card border border-[#EBEBEB] bg-white px-3 py-2 text-left text-[12px] font-medium transition hover:border-[#CCCCCC] hover:bg-[#F7F7F7] sm:min-w-[220px]",
          isPending ? "opacity-60" : "",
        ].join(" ")}
        aria-expanded={open}
        aria-controls="cod-date-picker-popover"
        aria-haspopup="dialog"
      >
        <span className="inline-flex min-w-0 items-center gap-2 text-[#111111]">
          <CalendarRange size={16} className="shrink-0 text-[#555555]" strokeWidth={1.8} />
          <span className="min-w-0 truncate">Collection days: {triggerLabel}</span>
        </span>
        <ChevronDown
          size={16}
          className={["shrink-0 text-[#999999] transition", open ? "rotate-180" : ""].join(" ")}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          id="cod-date-picker-popover"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,20rem)] rounded-card border border-[#EBEBEB] bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
          role="dialog"
          aria-label="Select collection days"
        >
          <p className="mb-2 text-[10.5px] font-medium uppercase tracking-wide text-[#999999]">Bahrain 14:00 → 14:00</p>
          <div
            className="grid grid-cols-4 gap-1.5 sm:grid-cols-7"
            role="group"
            aria-label="Select collection days (Bahrain 14:00 to 14:00)"
          >
            {options.map((o) => {
              const on = localKeys.includes(o.dateKey);
              return (
                <button
                  key={o.dateKey}
                  type="button"
                  onClick={() => void toggle(o.dateKey)}
                  className={[
                    "focus-ring flex min-h-[2.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center text-[10.5px] font-medium leading-tight tabular-nums",
                    on
                      ? "border-[#111111] bg-[#111111] text-white"
                      : "border-[#EBEBEB] bg-white text-[#555555] hover:border-[#CCCCCC] hover:text-[#111111]",
                  ].join(" ")}
                  aria-pressed={on}
                >
                  {o.isToday ? (
                    <span
                      className={["inline-block h-1.5 w-1.5 shrink-0 rounded-full", on ? "bg-emerald-300" : "bg-[#4CAF50]"].join(" ")}
                      title="Current collection window"
                    />
                  ) : (
                    <span className="h-1.5 shrink-0" aria-hidden />
                  )}
                  <span className="w-full [text-wrap:balance] [overflow-wrap:break-word] text-[10px] font-medium leading-tight [overflow-wrap:anywhere]">
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
