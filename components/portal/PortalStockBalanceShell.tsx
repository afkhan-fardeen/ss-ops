"use client";

import type { ReactNode } from "react";
import { StockBalancePreviewProvider } from "@/components/stock/StockBalancePreviewProvider";

export function PortalStockBalanceShell({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return <StockBalancePreviewProvider>{children}</StockBalancePreviewProvider>;
}
