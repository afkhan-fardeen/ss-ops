"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StockBalancePreview } from "@/lib/stock/load-stock-balance-preview";

export const STOCK_BALANCE_TOAST_ID = "stock-balance-preview";

type RefreshOptions = { silent?: boolean };

export type StockBalancePreviewContextValue = {
  preview: StockBalancePreview | null;
  loading: boolean;
  error: string | null;
  refresh: (opts?: RefreshOptions) => Promise<void>;
};

export const StockBalancePreviewContext =
  createContext<StockBalancePreviewContextValue | null>(null);

let inFlight: Promise<void> | null = null;

type PreviewApiResponse = { ok: boolean; error?: string } & Partial<StockBalancePreview>;

function parsePreview(json: PreviewApiResponse): StockBalancePreview {
  if (
    !json.rows ||
    !json.location ||
    !json.fetchedAt ||
    json.itemCount === undefined ||
    !json.summary
  ) {
    throw new Error("Invalid stock balance preview response");
  }
  return {
    rows: json.rows,
    location: json.location,
    fetchedAt: json.fetchedAt,
    itemCount: json.itemCount,
    summary: json.summary,
  };
}

export function StockBalancePreviewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [preview, setPreview] = useState<StockBalancePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: RefreshOptions) => {
    if (inFlight) return inFlight;

    const silent = opts?.silent ?? false;

    inFlight = (async () => {
      setLoading(true);
      setError(null);

      if (!silent) {
        toast.loading("Refreshing stock balance…", { id: STOCK_BALANCE_TOAST_ID });
      }

      try {
        const res = await fetch("/api/stock-balance/preview", { cache: "no-store" });
        const json = (await res.json()) as PreviewApiResponse;
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }

        const next = parsePreview(json);
        setPreview(next);

        if (!silent) {
          const n = next.summary.mismatched;
          toast.success(
            `Stock balance ready — ${next.itemCount} items, ${n} mismatch${n === 1 ? "" : "es"}`,
            {
              id: STOCK_BALANCE_TOAST_ID,
              duration: 8_000,
              action: {
                label: "View",
                onClick: () => router.push("/stock-balance/balance"),
              },
            },
          );
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load stock balance";
        setError(message);
        if (!silent) {
          toast.error(message, { id: STOCK_BALANCE_TOAST_ID });
        }
      } finally {
        setLoading(false);
        inFlight = null;
      }
    })();

    return inFlight;
  }, [router]);

  const value = useMemo(
    () => ({ preview, loading, error, refresh }),
    [preview, loading, error, refresh],
  );

  return (
    <StockBalancePreviewContext.Provider value={value}>
      {children}
    </StockBalancePreviewContext.Provider>
  );
}
