"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CalendarRange } from "lucide-react";

export type CodDateOption = {
  dateKey: string;
  label: string;
  isToday: boolean;
};

const MAX_DAYS = 14;
const DEBOUNCE_MS = 250;
const POP_Z = 200;
const GAP = 6;

type PopPos = { top: number; left: number; width: number };

function clampPopoverLeft(left: number, width: number): number {
  if (typeof window === "undefined") return left;
  const pad = 8;
  return Math.max(pad, Math.min(left, window.innerWidth - width - pad));
}

/**
 * Multi-select (checkboxes) for up to 14 close dates. Popover in a portal to avoid z-index with fixed footer.
 * URL updates via parent `onApplyKeys` (debounced).
 */
export function CodDatePicker({
  options,
  selectedDateKeys,
  onApplyKeys,
  isPending,
}: {
  options: CodDateOption[];
  selectedDateKeys: string[];
  onApplyKeys: (sortedKeys: string[]) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [localKeys, setLocalKeys] = useState<string[]>(selectedDateKeys);
  const [mounted, setMounted] = useState(false);
  const [popPos, setPopPos] = useState<PopPos>({ top: 0, left: 0, width: 280 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalKeys(selectedDateKeys);
  }, [selectedDateKeys]);

  useEffect(() => {
    if (isPending) setOpen(false);
  }, [isPending]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(320, Math.max(r.width, 220));
    const left = clampPopoverLeft(r.left, w);
    setPopPos({ top: r.bottom + GAP, left, width: w });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const schedulePush = useCallback(
    (next: string[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const sorted = [...new Set(next)].filter(Boolean).sort();
        if (sorted.length === 0) return;
        onApplyKeys(sorted);
      }, DEBOUNCE_MS);
    },
    [onApplyKeys],
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

  const popoverStyle: CSSProperties = {
    zIndex: POP_Z,
    top: popPos.top,
    left: popPos.left,
    width: popPos.width,
    maxWidth: "calc(100vw - 16px)",
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
        }}
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
      {mounted && open
        ? createPortal(
            <div
              ref={popoverRef}
              id="cod-date-picker-popover"
              className="fixed max-h-[min(50vh,20rem)] overflow-hidden rounded-card border border-[#EBEBEB] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
              style={popoverStyle}
              role="dialog"
              aria-label="Select collection days"
            >
              <fieldset className="border-0 p-3">
                <legend className="mb-2 block text-[10.5px] font-medium uppercase tracking-wide text-[#999999]">
                  Collection close dates · Bahrain 14:00 → 14:00
                </legend>
                <div className="max-h-[min(48vh,18.5rem)] space-y-0 overflow-y-auto pr-0.5">
                  {options.map((o) => {
                    const checked = localKeys.includes(o.dateKey);
                    const id = `cod-day-${o.dateKey}`;
                    return (
                      <label
                        key={o.dateKey}
                        htmlFor={id}
                        className={[
                          "flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent py-1.5 pl-0.5 pr-2 text-[12px] leading-snug",
                          "hover:border-[#EBEBEB] hover:bg-[#F7F7F7]",
                        ].join(" ")}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          checked={checked}
                          onChange={() => void toggle(o.dateKey)}
                          className="focus-ring h-3.5 w-3.5 shrink-0 rounded border-[#CCCCCC] text-[#111111] accent-[#111111]"
                        />
                        {o.isToday ? (
                          <span
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#4CAF50]"
                            title="Current collection window"
                            aria-label="Current collection window"
                          />
                        ) : (
                          <span className="h-1.5 w-1.5 shrink-0" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 text-[#111111] [overflow-wrap:break-word]">{o.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
