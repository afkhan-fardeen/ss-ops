"use client";

import { useState } from "react";
import {
  formatCurrencyTotals,
  type SpendSlice,
} from "@/lib/subscriptions/load-dashboard-summary";

type TabKey = "all" | "employee" | "business";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "employee", label: "Employee" },
  { key: "business", label: "Business" },
];

export function SubscriptionSpendPanel({
  spendAll,
  spendEmployee,
  spendBusiness,
}: {
  spendAll: SpendSlice;
  spendEmployee: SpendSlice;
  spendBusiness: SpendSlice;
}) {
  const [tab, setTab] = useState<TabKey>("all");

  const slice =
    tab === "employee" ? spendEmployee : tab === "business" ? spendBusiness : spendAll;

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-medium text-ink">Spend overview</h3>
          <p className="mt-0.5 text-[12px] text-muted">
            Est. monthly burn (yearly ÷ 12) · one-time excluded
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "rounded-full px-3 py-1 text-[11px] font-medium transition",
                tab === t.key
                  ? "bg-ink text-white"
                  : "border border-line bg-white text-muted hover:text-ink",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">Est. monthly burn</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums text-ink">
            {formatCurrencyTotals(slice.monthlyEquivalentByCurrency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">Annualized</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums text-ink">
            {formatCurrencyTotals(slice.annualizedByCurrency)}
          </p>
        </div>
      </div>

      {slice.monthlyEquivalentByCurrency.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-[12px] text-muted">
          {slice.monthlyEquivalentByCurrency.map((r) => (
            <li key={r.currency} className="flex justify-between gap-3">
              <span>
                {r.count} plan{r.count === 1 ? "" : "s"} · {r.currency} / mo
              </span>
              <span className="font-mono text-ink">
                {r.currency} {r.total.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[12px] text-muted">No recurring spend in this slice yet.</p>
      )}
    </div>
  );
}
