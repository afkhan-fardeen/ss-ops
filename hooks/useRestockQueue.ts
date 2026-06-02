"use client";

import { useCallback, useReducer } from "react";
import { toast } from "sonner";

export type RestockRowInput = {
  ubexId: string;
  barcode: string;
  productName: string;
  ubexStock: number;
  shopifyOnHand: number | null;
  shopifyAvailable: number | null;
  shopifyCommitted: number | null;
};

export type RestockRowStatus = "idle" | "busy" | "success" | "error";

export type RestockRowState = {
  status: RestockRowStatus;
  message?: string;
};

export type RestockRowStateMap = Record<string, RestockRowState>;

type RestockApiResult = {
  ok: boolean;
  skipped?: boolean;
  idempotent?: boolean;
  error?: string;
  ubexStock?: number;
  previousOnHand?: number;
  newOnHand?: number;
};

type Action =
  | { type: "busy"; ubexId: string }
  | { type: "success"; ubexId: string; skipped?: boolean; idempotent?: boolean }
  | { type: "error"; ubexId: string; message: string }
  | { type: "reset"; ubexId: string };

function reducer(state: RestockRowStateMap, action: Action): RestockRowStateMap {
  switch (action.type) {
    case "busy":
      return { ...state, [action.ubexId]: { status: "busy" } };
    case "success":
      return { ...state, [action.ubexId]: { status: "success" } };
    case "error":
      return { ...state, [action.ubexId]: { status: "error", message: action.message } };
    case "reset":
      return { ...state, [action.ubexId]: { status: "idle" } };
    default:
      return state;
  }
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

export function useRestockQueue() {
  const [state, dispatch] = useReducer(reducer, {});

  const restockOne = useCallback(async (row: RestockRowInput): Promise<boolean> => {
    dispatch({ type: "busy", ubexId: row.ubexId });
    try {
      const result = await apiRestockSingle({ ubexId: row.ubexId, barcode: row.barcode });
      if (!result.ok) {
        dispatch({ type: "error", ubexId: row.ubexId, message: result.error ?? "Restock failed" });
        toast.error(result.error ?? "Restock failed");
        return false;
      }
      dispatch({
        type: "success",
        ubexId: row.ubexId,
        skipped: result.skipped,
        idempotent: result.idempotent,
      });
      if (result.skipped) toast.info(`${row.productName}: already in sync`);
      else if (result.idempotent) toast.info(`${row.productName}: already restocked today`);
      else toast.success(`${row.productName}: on hand → ${result.newOnHand ?? result.ubexStock}`);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Restock failed";
      dispatch({ type: "error", ubexId: row.ubexId, message });
      toast.error(message);
      return false;
    }
  }, []);

  const restockBulk = useCallback(
    async (rows: RestockRowInput[]): Promise<{ ok: number; fail: number }> => {
      for (const row of rows) dispatch({ type: "busy", ubexId: row.ubexId });

      try {
        const payload = rows.map((r) => ({ ubexId: r.ubexId, barcode: r.barcode }));
        const res = await apiRestockBulk(payload);
        if (!res.ok || !res.results) {
          const err = res.error ?? "Bulk restock failed";
          for (const row of rows) dispatch({ type: "error", ubexId: row.ubexId, message: err });
          toast.error(err);
          return { ok: 0, fail: rows.length };
        }

        let ok = 0;
        let fail = 0;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]!;
          const result = res.results[i];
          if (result?.ok) {
            dispatch({ type: "success", ubexId: row.ubexId });
            ok++;
          } else {
            dispatch({
              type: "error",
              ubexId: row.ubexId,
              message: result?.error ?? "Failed",
            });
            fail++;
          }
        }

        if (fail === 0) toast.success(`Restocked ${ok} item${ok === 1 ? "" : "s"}`);
        else toast.warning(`${ok} restocked, ${fail} failed`);

        return { ok, fail };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Bulk restock failed";
        for (const row of rows) dispatch({ type: "error", ubexId: row.ubexId, message });
        toast.error(message);
        return { ok: 0, fail: rows.length };
      }
    },
    [],
  );

  return { state, restockOne, restockBulk };
}
