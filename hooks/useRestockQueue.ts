"use client";

import { useContext } from "react";
import { RestockQueueContext } from "@/components/stock/RestockQueueProvider";

export type {
  RestockRowInput,
  RestockRowState,
  RestockRowStateMap,
  RestockRowStatus,
} from "@/components/stock/RestockQueueProvider";

/**
 * State lives in RestockQueueProvider, mounted once at the shell layout level —
 * navigating between pages while a restock is in flight no longer loses progress.
 */
export function useRestockQueue() {
  const ctx = useContext(RestockQueueContext);
  if (!ctx) {
    throw new Error("useRestockQueue must be used within RestockQueueProvider");
  }
  return ctx;
}
