"use client";

import { useContext } from "react";
import { RestockQueueContext } from "@/components/stock/RestockQueueProvider";

/**
 * Tolerant read of restock progress — unlike useRestockQueue, this never throws
 * when RestockQueueProvider isn't mounted (e.g. Topbar renders for non-admins too).
 */
export function useRestockStatus() {
  const ctx = useContext(RestockQueueContext);
  return { running: ctx?.running ?? false, activeCount: ctx?.activeCount ?? 0 };
}
