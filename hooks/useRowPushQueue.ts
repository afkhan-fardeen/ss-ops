"use client";

import { useCallback, useMemo, useReducer } from "react";
import { toast } from "sonner";

type FulfillResult =
  | { ok: true; fulfillmentId: number; idempotent?: boolean }
  | { ok: false; error: string };

async function apiFulfill(
  input: {
    orderId: number;
    orderName?: string;
    trackingNumber: string;
    trackingUrl?: string;
  },
  endpoint: string,
): Promise<FulfillResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<FulfillResult>;
}

export type RowStatus = "pending" | "matched" | "fulfilled" | "error";

export type RowState = {
  status: RowStatus;
  message?: string;
  fulfillmentId?: number;
  busy?: boolean;
};

export type RowStateMap = Record<string, RowState>;

export type InitialLogEntry = {
  orderName: string;
  status: "success" | "error";
  message?: string;
  fulfillmentId?: number;
};

/**
 * Minimal shape a row must satisfy to be pushed. Both CodRow and OrderRow match this.
 */
export type PushableRow = {
  orderId: number;
  orderName: string;
  ubexId?: string;
  trackingUrl?: string;
  alreadyFulfilled?: boolean;
};

type Action =
  | { type: "busy"; orderName: string }
  | { type: "fulfilled"; orderName: string; fulfillmentId: number }
  | { type: "error"; orderName: string; message: string }
  | { type: "reset-error"; orderName: string };

function reducer(state: RowStateMap, action: Action): RowStateMap {
  switch (action.type) {
    case "busy": {
      const prev = state[action.orderName];
      if (!prev) return state;
      return { ...state, [action.orderName]: { ...prev, busy: true, message: undefined } };
    }
    case "fulfilled":
      return {
        ...state,
        [action.orderName]: {
          status: "fulfilled",
          fulfillmentId: action.fulfillmentId,
          busy: false,
        },
      };
    case "error": {
      const prev = state[action.orderName];
      return {
        ...state,
        [action.orderName]: {
          status: "error",
          message: action.message,
          busy: false,
          fulfillmentId: prev?.fulfillmentId,
        },
      };
    }
    case "reset-error": {
      const prev = state[action.orderName];
      if (!prev || prev.status !== "error") return state;
      return {
        ...state,
        [action.orderName]: {
          status: prev.fulfillmentId ? "fulfilled" : "matched",
          busy: false,
        },
      };
    }
    default:
      return state;
  }
}

export function deriveInitial<R extends PushableRow>(
  rows: R[],
  logs?: InitialLogEntry[],
): RowStateMap {
  const logByOrder = new Map<string, InitialLogEntry>();
  for (const l of logs ?? []) logByOrder.set(l.orderName, l);
  const m: RowStateMap = {};
  for (const r of rows) {
    if (r.alreadyFulfilled) {
      const log = logByOrder.get(r.orderName);
      m[r.orderName] = {
        status: "fulfilled",
        message: log?.message ?? "Already fulfilled in Shopify",
        fulfillmentId: log?.fulfillmentId,
      };
      continue;
    }
    const log = logByOrder.get(r.orderName);
    if (log?.status === "error") {
      m[r.orderName] = { status: "error", message: log.message ?? "Last push failed" };
      continue;
    }
    if (r.ubexId) m[r.orderName] = { status: "matched" };
    else m[r.orderName] = { status: "pending" };
  }
  return m;
}

/**
 * Shared hook powering COD + Fulfillment row pushes.
 * - Exposes `stateMap`, `pushOne(row)`, and `fulfilAll(rows)`.
 * - Shows sonner toasts on single-row push and a summary toast on bulk fulfil.
 * - `pushEndpoint` defaults to "/api/fulfill"; pass "/api/store2/fulfill" for Store 2.
 */
export function useRowPushQueue<R extends PushableRow>(
  rows: R[],
  initialLogs?: InitialLogEntry[],
  pushEndpoint = "/api/fulfill",
) {
  const initial = useMemo(() => deriveInitial(rows, initialLogs), [rows, initialLogs]);
  const [stateMap, dispatch] = useReducer(reducer, initial);

  const pushOne = useCallback(
    async (row: R, opts?: { silent?: boolean }): Promise<boolean> => {
      if (!row.ubexId) return false;
      dispatch({ type: "busy", orderName: row.orderName });
      const res = await apiFulfill(
        {
          orderId: row.orderId,
          orderName: row.orderName,
          trackingNumber: row.ubexId,
          trackingUrl: row.trackingUrl || undefined,
        },
        pushEndpoint,
      );
      if (res.ok) {
        dispatch({ type: "fulfilled", orderName: row.orderName, fulfillmentId: res.fulfillmentId });
        if (!opts?.silent) {
          toast.success(`Fulfilled ${row.orderName}`, {
            description: `Tracking ${row.ubexId}`,
          });
        }
        return true;
      }
      dispatch({ type: "error", orderName: row.orderName, message: res.error });
      if (!opts?.silent) {
        toast.error(`Could not fulfil ${row.orderName}`, {
          description: res.error,
        });
      }
      return false;
    },
    [],
  );

  const fulfilAll = useCallback(
    async (targets: R[]): Promise<{ success: number; failed: number; total: number }> => {
      const queue = targets.filter((r) => r.ubexId && !r.alreadyFulfilled);
      const total = queue.length;
      if (total === 0) {
        toast.info("Nothing to fulfil", { description: "No matched rows available." });
        return { success: 0, failed: 0, total: 0 };
      }
      const concurrency = 3;
      let success = 0;
      let failed = 0;
      const work = [...queue];
      async function worker() {
        while (work.length > 0) {
          const row = work.shift();
          if (!row) break;
          const ok = await pushOne(row, { silent: true });
          if (ok) success++;
          else failed++;
        }
      }
      const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
      await Promise.all(workers);
      if (failed === 0) {
        toast.success(`Fulfilled ${success} of ${total}`);
      } else if (success === 0) {
        toast.error(`All ${total} pushes failed`);
      } else {
        toast.warning(`Fulfilled ${success} of ${total}`, {
          description: `${failed} failed — check the error rows.`,
        });
      }
      return { success, failed, total };
    },
    [pushOne],
  );

  return { stateMap, pushOne, fulfilAll, dispatch };
}
