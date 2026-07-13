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
const POP_Z = 200;
const GAP = 6;

type PopPos = { top: number; left: number; width: number };

function clampPopoverLeft(left: number, width: number): number {
  if (typeof window === "undefined") return left;
  const pad = 8;
  return Math.max(pad, Math.min(left, window.innerWidth - width - pad));
}

/**
 * Multi-select (checkboxes) with draft; **Apply** commits URL. Today and past days can be selected together.
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
  const [draftKeys, setDraftKeys] = useState<string[]>(selectedDateKeys);
  const [applyError, setApplyError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popPos, setPopPos] = useState<PopPos>({ top: 0, left: 0, width: 280 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPending) setOpen(false);
  }, [isPending]);

  /** When popover is closed, keep draft in sync with URL. */
  useEffect(() => {
    if (!open) {
      setDraftKeys([...selectedDateKeys]);
    }
  }, [selectedDateKeys, open]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(360, Math.max(r.width, 260));
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

  const revertDraft = useCallback(() => {
    setDraftKeys([...selectedDateKeys]);
    setApplyError(false);
  }, [selectedDateKeys]);

  const close = useCallback(() => {
    setOpen(false);
    revertDraft();
  }, [revertDraft]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      close();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const toggle = useCallback((key: string, _o: CodDateOption) => {
    setApplyError(false);
    setDraftKeys((prev) => {
      const has = prev.includes(key);
      if (has) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key).sort();
      }
      if (prev.length >= MAX_DAYS) return prev;
      const next = new Set(prev);
      next.add(key);
      return [...next].sort();
    });
  }, []);

  function apply() {
    if (draftKeys.length === 0) {
      setApplyError(true);
      return;
    }
    onApplyKeys([...new Set(draftKeys)].filter(Boolean).sort());
    setOpen(false);
  }

  const appliedSingle = selectedDateKeys.length === 1 ? options.find((o) => o.dateKey === selectedDateKeys[0])?.label : null;
  const triggerLabel = appliedSingle ?? `${selectedDateKeys.length} day${selectedDateKeys.length === 1 ? "" : "s"}`;

  const popoverStyle: CSSProperties = {
    zIndex: POP_Z,
    top: popPos.top,
    left: popPos.left,
    width: popPos.width,
    maxWidth: "calc(100vw - 16px)",
  };

  return (
    <div className="relative">
      <p className="mb-1.5 text-[10px] text-muted">Select one or more dates (including today), then Apply.</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setDraftKeys([...selectedDateKeys]);
          setApplyError(false);
          setOpen(true);
        }}
        className={[
          "focus-ring inline-flex w-full min-w-0 max-w-md items-center justify-between gap-2 rounded-card border border-line bg-white px-3 py-2 text-left text-[12px] font-medium transition hover:border-line hover:bg-canvas sm:min-w-[220px]",
          isPending ? "opacity-60" : "",
        ].join(" ")}
        aria-expanded={open}
        aria-controls="cod-date-picker-popover"
        aria-haspopup="dialog"
      >
        <span className="inline-flex min-w-0 items-center gap-2 text-ink">
          <CalendarRange size={16} className="shrink-0 text-muted" strokeWidth={1.8} />
          <span className="min-w-0 truncate">Collection days: {triggerLabel}</span>
        </span>
        <ChevronDown
          size={16}
          className={["shrink-0 text-muted transition", open ? "rotate-180" : ""].join(" ")}
          strokeWidth={2}
        />
      </button>
      {mounted && open
        ? createPortal(
            <div
              ref={popoverRef}
              id="cod-date-picker-popover"
              className="fixed flex max-h-[min(90vh,28rem)] flex-col overflow-hidden rounded-card border border-line bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
              style={popoverStyle}
              role="dialog"
              aria-label="Select collection days"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <fieldset className="border-0 p-0">
                  <legend className="mb-2 block text-[10.5px] font-medium uppercase tracking-wide text-muted">
                    Collection close dates · Bahrain 14:00 → 14:00
                  </legend>
                  <div className="space-y-0.5 pr-0.5">
                    {options.map((o) => {
                      const checked = draftKeys.includes(o.dateKey);
                      const id = `cod-day-${o.dateKey}`;
                      return (
                        <label
                          key={o.dateKey}
                          htmlFor={id}
                          className={[
                            "flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent py-1.5 pl-0.5 pr-2 text-[12px] leading-snug",
                            "hover:border-line hover:bg-canvas",
                          ].join(" ")}
                        >
                          <input
                            id={id}
                            type="checkbox"
                            checked={checked}
                            onChange={() => void toggle(o.dateKey, o)}
                            className="focus-ring h-3.5 w-3.5 shrink-0 rounded border-line text-ink accent-ink"
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
                          <span className="min-w-0 flex-1 text-ink [overflow-wrap:break-word]">{o.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
              {applyError ? (
                <p className="border-t border-line bg-[#FDF6F5] px-3 py-2 text-[11px] font-medium text-[#B45353]" role="alert">
                  Select at least one date.
                </p>
              ) : null}
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => close()}
                  className="focus-ring rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-muted transition hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={draftKeys.length === 0}
                  className="focus-ring rounded-lg border border-ink bg-ink px-3 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
