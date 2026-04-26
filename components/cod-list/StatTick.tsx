"use client";

import { useEffect, useState } from "react";

/**
 * Counts from 0 to `value` on mount and when `value` changes (short ease-out).
 */
export function StatTick({ value, durationMs = 550 }: { value: number; durationMs?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setN(0);
      return;
    }
    setN(0);
    const t0 = performance.now();
    let raf: number;
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

    function step(now: number) {
      const p = Math.min(1, (now - t0) / durationMs);
      setN(Math.round(value * easeOut(p)));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className="tabular-nums font-mono text-[12px] text-[#999999]">{n}</span>;
}
