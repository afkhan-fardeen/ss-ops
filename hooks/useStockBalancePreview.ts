"use client";

import { useContext } from "react";
import { StockBalancePreviewContext } from "@/components/stock/StockBalancePreviewProvider";

export function useStockBalancePreview() {
  const ctx = useContext(StockBalancePreviewContext);
  if (!ctx) {
    throw new Error("useStockBalancePreview must be used within StockBalancePreviewProvider");
  }
  return ctx;
}
