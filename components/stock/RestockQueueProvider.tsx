"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StoreInventorySide } from "@/lib/stock/build-balance-rows";

export type RestockRowInput = {
  ubexId: string;
  barcode: string;
  productName: string;
  ubexStock: number;
  shopifyOnHand: number | null;
  shopifyAvailable: number | null;
  shopifyCommitted: number | null;
  storeA?: StoreInventorySide;
  storeB?: StoreInventorySide | null;
  sharedAvailable?: number | null;
};

export type RestockRowStatus = "idle" | "busy" | "success" | "error";

export type RestockRowState = {
  status: RestockRowStatus;
  message?: string;
  productName: string;
};

export type RestockRowStateMap = Record<string, RestockRowState>;

type RestockApiResult = {
  ok: boolean;
  skipped?: boolean;
  idempotent?: boolean;
  error?: string;
  ubexStock?: number;
  sharedAvailable?: number;
  stores?: Array<{
    storeId: 1 | 2;
    ok: boolean;
    skipped?: boolean;
    idempotent?: boolean;
    error?: string;
  }>;
  previousOnHand?: number;
  newOnHand?: number;
};

type Action =
  | { type: "busy"; ubexId: string; productName: string }
  | { type: "success"; ubexId: string; productName: string }
  | { type: "error"; ubexId: string; message: string; productName: string }
  | { type: "reset"; ubexId: string };

function reducer(state: RestockRowStateMap, action: Action): RestockRowStateMap {
  switch (action.type) {
    case "busy":
      return {
        ...state,
        [action.ubexId]: { status: "busy", productName: action.productName },
      };
    case "success":
      return {
        ...state,
        [action.ubexId]: { status: "success", productName: action.productName },
      };
    case "error":
      return {
        ...state,
        [action.ubexId]: {
          status: "error",
          message: action.message,
          productName: action.productName,
        },
      };
    case "reset":
      return {
        ...state,
        [action.ubexId]: {
          status: "idle",
          productName: state[action.ubexId]?.productName ?? "",
        },
      };
    default:
      return state;
  }
}

function summarizeStores(result: RestockApiResult): string {
  if (!result.stores?.length) {
    if (result.skipped) return "already in sync";
    if (result.idempotent) return "already synced today";
    return `shared → ${result.sharedAvailable ?? result.ubexStock ?? "?"}`;
  }
  const parts = result.stores.map((s) => {
    const label = s.storeId === 1 ? "A" : "B";
    if (s.skipped) return `${label} skipped`;
    if (!s.ok) return `${label} failed`;
    return `${label} ok`;
  });
  return parts.join(" · ");
}

async function apiRestockSingle(input: { ubexId: string; barcode: string }): Promise<RestockApiResult> {
  const res = await fetch("/api/stock-balance/restock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<RestockApiResult>;
}

async function apiRestockBulk(
  items: Array<{ ubexId: string; barcode: string }>,
): Promise<{ ok: boolean; results?: RestockApiResult[]; error?: string }> {
  const res = await fetch("/api/stock-balance/restock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  return res.json() as Promise<{ ok: boolean; results?: RestockApiResult[]; error?: string }>;
}

export const RESTOCK_TOAST_ID = "stock-balance-restock";

export type RestockQueueContextValue = {
  state: RestockRowStateMap;
  running: boolean;
  activeCount: number;
  restockOne: (row: RestockRowInput) => Promise<boolean>;
  restockBulk: (rows: RestockRowInput[]) => Promise<{ ok: number; fail: number }>;
};

export const RestockQueueContext = createContext<RestockQueueContextValue | null>(null);

export function RestockQueueProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {});
  const [activeCount, setActiveCount] = useState(0);

  const restockOne = useCallback(async (row: RestockRowInput): Promise<boolean> => {
    dispatch({ type: "busy", ubexId: row.ubexId, productName: row.productName });
    setActiveCount((n) => n + 1);
    try {
      const result = await apiRestockSingle({ ubexId: row.ubexId, barcode: row.barcode });
      if (!result.ok) {
        dispatch({
          type: "error",
          ubexId: row.ubexId,
          message: result.error ?? "Sync failed",
          productName: row.productName,
        });
        toast.error(result.error ?? "Sync failed");
        return false;
      }
      dispatch({ type: "success", ubexId: row.ubexId, productName: row.productName });
      toast.success(`${row.productName}: ${summarizeStores(result)}`);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed";
      dispatch({ type: "error", ubexId: row.ubexId, message, productName: row.productName });
      toast.error(message);
      return false;
    } finally {
      setActiveCount((n) => Math.max(0, n - 1));
    }
  }, []);

  const restockBulk = useCallback(
    async (rows: RestockRowInput[]): Promise<{ ok: number; fail: number }> => {
      for (const row of rows) {
        dispatch({ type: "busy", ubexId: row.ubexId, productName: row.productName });
      }
      setActiveCount((n) => n + rows.length);

      toast.loading(`Syncing ${rows.length} item${rows.length === 1 ? "" : "s"}…`, {
        id: RESTOCK_TOAST_ID,
      });

      try {
        const payload = rows.map((r) => ({ ubexId: r.ubexId, barcode: r.barcode }));
        const res = await apiRestockBulk(payload);
        if (!res.ok || !res.results) {
          const err = res.error ?? "Bulk sync failed";
          for (const row of rows) {
            dispatch({
              type: "error",
              ubexId: row.ubexId,
              message: err,
              productName: row.productName,
            });
          }
          toast.error(err, { id: RESTOCK_TOAST_ID });
          return { ok: 0, fail: rows.length };
        }

        let ok = 0;
        let fail = 0;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]!;
          const result = res.results[i];
          if (result?.ok) {
            dispatch({ type: "success", ubexId: row.ubexId, productName: row.productName });
            ok++;
          } else {
            dispatch({
              type: "error",
              ubexId: row.ubexId,
              message: result?.error ?? "Failed",
              productName: row.productName,
            });
            fail++;
          }
        }

        const toastOpts = {
          id: RESTOCK_TOAST_ID,
          action: { label: "View", onClick: () => router.push("/stock-balance/balance") },
        };
        if (fail === 0) toast.success(`Synced ${ok} item${ok === 1 ? "" : "s"}`, toastOpts);
        else toast.warning(`${ok} synced, ${fail} failed`, toastOpts);

        return { ok, fail };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Bulk sync failed";
        for (const row of rows) {
          dispatch({
            type: "error",
            ubexId: row.ubexId,
            message,
            productName: row.productName,
          });
        }
        toast.error(message, { id: RESTOCK_TOAST_ID });
        return { ok: 0, fail: rows.length };
      } finally {
        setActiveCount((n) => Math.max(0, n - rows.length));
      }
    },
    [router],
  );

  const value = useMemo<RestockQueueContextValue>(
    () => ({ state, running: activeCount > 0, activeCount, restockOne, restockBulk }),
    [state, activeCount, restockOne, restockBulk],
  );

  return <RestockQueueContext.Provider value={value}>{children}</RestockQueueContext.Provider>;
}
