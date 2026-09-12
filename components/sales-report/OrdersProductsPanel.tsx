"use client";

import { useState } from "react";
import type { SalesOrderRow, TopProduct } from "@/lib/sales/daily-sales-report";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bahrain",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersProductsPanel({
  orders,
  topProducts,
  currency,
}: {
  orders: SalesOrderRow[];
  topProducts: TopProduct[];
  currency: string;
}) {
  const [view, setView] = useState<"orders" | "products">("orders");

  return (
    <div className="rounded-card border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <p className="text-[12px] font-medium text-ink">
          {view === "orders" ? `Orders (${orders.length})` : `Products (${topProducts.length})`}
        </p>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as "orders" | "products")}
          className="focus-ring rounded-lg border border-line bg-white px-2 py-1 text-[12px] font-medium text-ink"
        >
          <option value="orders">Orders</option>
          <option value="products">Products</option>
        </select>
      </div>

      {view === "orders" ? (
        orders.length === 0 ? (
          <p className="p-4 text-[12px] text-muted">No orders this day.</p>
        ) : (
          <div className="mt-2 max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wider text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderName} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 font-mono text-ink">{o.orderName}</td>
                    <td className="px-4 py-2 font-mono text-muted">{formatTime(o.createdAt)}</td>
                    <td className="px-4 py-2 text-right font-medium text-ink">
                      {formatMoney(o.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : topProducts.length === 0 ? (
        <p className="p-4 text-[12px] text-muted">No line items this day.</p>
      ) : (
        <ul className="space-y-1.5 p-4 pt-2">
          {topProducts.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
              <span className="shrink-0 font-mono text-muted">{p.unitsSold}×</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
