"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type StockErrorsCountContextValue = {
  count: number | null;
  setCount: (count: number) => void;
};

const StockErrorsCountContext = createContext<StockErrorsCountContextValue | null>(null);

export function StockErrorsCountProvider({ children }: { children: ReactNode }) {
  const [count, setCountState] = useState<number | null>(null);
  const setCount = useCallback((next: number) => {
    setCountState(next);
  }, []);

  const value = useMemo(() => ({ count, setCount }), [count, setCount]);

  return (
    <StockErrorsCountContext.Provider value={value}>{children}</StockErrorsCountContext.Provider>
  );
}

export function useStockErrorsCount() {
  return useContext(StockErrorsCountContext);
}

export function StockErrorsNavBadge({ href }: { href: string }) {
  const ctx = useStockErrorsCount();
  if (href !== "/stock-balance/errors") return null;
  if (ctx?.count == null || ctx.count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-stock-bg px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-stock">
      {ctx.count > 99 ? "99+" : ctx.count}
    </span>
  );
}
