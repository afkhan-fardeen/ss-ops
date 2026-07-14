"use client";

import type { ReactNode } from "react";
import { StockBalancePreviewProvider } from "@/components/stock/StockBalancePreviewProvider";
import { RestockQueueProvider } from "@/components/stock/RestockQueueProvider";

export function PortalStockBalanceShell({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <StockBalancePreviewProvider>
      <RestockQueueProvider>{children}</RestockQueueProvider>
    </StockBalancePreviewProvider>
  );
}
