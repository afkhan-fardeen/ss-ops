"use client";

import { useMemo, useState } from "react";
import { Clock, CheckCircle, Send, AlertCircle } from "lucide-react";
import type { OrderRow } from "@/lib/orders/build-order-rows";
import { UbexStatusLine } from "@/components/cod-list/UbexStatusLine";
import type { InitialLogEntry, RowState, RowStateMap, RowStatus } from "@/hooks/useRowPushQueue";
import { useRowPushQueue } from "@/hooks/useRowPushQueue";
import { FulfillmentTable } from "./FulfillmentTable";
import { FulfillmentFooter } from "./FulfillmentFooter";

type FilterKey = "all" | "cod" | "paid" | "waiting" | "matched" | "fulfilled" | "error";

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "waiting",   label: "Waiting for Ubex" },
  { key: "matched",   label: "Ready to push" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "error",     label: "Errors" },
  { key: "cod",       label: "COD" },
  { key: "paid",      label: "Paid" },
];

function applyFilter(rows: OrderRow[], filter: FilterKey, stateMap: RowStateMap): OrderRow[] {
  switch (filter) {
    case "all":      return rows;
    case "cod":      return rows.filter((r) => r.isCod);
    case "paid":     return rows.filter((r) => !r.isCod);
    case "waiting":  return rows.filter((r) => stateMap[r.orderName]?.status === "pending");
    case "matched":  return rows.filter((r) => stateMap[r.orderName]?.status === "matched");
    case "fulfilled":return rows.filter((r) => stateMap[r.orderName]?.status === "fulfilled");
    case "error":    return rows.filter((r) => stateMap[r.orderName]?.status === "error");
  }
}

function StatCard({
  icon: Icon,
  label,
  count,
  color,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: "amber" | "blue" | "green" | "red" | "neutral";
  active: boolean;
  onClick: () => void;
}) {
  const colors = {
    amber:   { bg: "bg-[rgba(240,183,67,0.10)]",   text: "text-[#C9920D]", border: "border-[rgba(240,183,67,0.35)]",  num: "text-[#C9920D]" },
    blue:    { bg: "bg-[rgba(59,130,246,0.08)]",   text: "text-[#2563EB]", border: "border-[rgba(59,130,246,0.30)]",  num: "text-[#2563EB]" },
    green:   { bg: "bg-[rgba(76,175,80,0.10)]",    text: "text-[#2E7D32]", border: "border-[rgba(76,175,80,0.30)]",   num: "text-[#2E7D32]" },
    red:     { bg: "bg-[rgba(194,81,81,0.10)]",    text: "text-[#C25151]", border: "border-[rgba(194,81,81,0.30)]",   num: "text-[#C25151]" },
    neutral: { bg: "bg-[#F7F7F7]",                 text: "text-[#555555]", border: "border-[#EBEBEB]",                num: "text-[#111111]" },
  };
  const c = colors[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-1 cursor-pointer items-center gap-3 rounded-card border p-4 text-left transition",
        active ? `${c.bg} ${c.border} shadow-[0_0_0_2px_currentColor] shadow-[color:var(--tw-shadow-color)]` : `${c.bg} ${c.border} hover:shadow-soft`,
      ].join(" ")}
      style={active ? { boxShadow: `0 0 0 2px ${c.border.replace("border-", "")}` } : undefined}
    >
      <Icon size={18} className={c.text} strokeWidth={2} />
      <div>
        <p className={`text-xl font-bold tabular-nums ${c.num}`}>{count}</p>
        <p className={`text-[11px] font-medium ${c.text}`}>{label}</p>
      </div>
    </button>
  );
}

export function FulfillmentView({
  rows,
  ubexTokenConfigured,
  ubexTotalShipments,
  ubexConflictsCount,
  ubexApiMessage,
  ubexError,
  initialLogs,
}: {
  rows: OrderRow[];
  ubexTokenConfigured: boolean;
  ubexTotalShipments?: number;
  ubexConflictsCount?: number;
  ubexApiMessage?: string;
  ubexError?: string;
  initialLogs?: InitialLogEntry[];
}) {
  const { stateMap, pushOne, fulfilAll } = useRowPushQueue<OrderRow>(rows, initialLogs);
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredRows = useMemo(() => applyFilter(rows, filter, stateMap), [rows, filter, stateMap]);

  async function pushRow(row: OrderRow): Promise<boolean> {
    const current = stateMap[row.orderName];
    if (current?.status === "fulfilled") return true;
    return pushOne(row);
  }

  async function handleFulfilAll() {
    const targets = filteredRows.filter(
      (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
    );
    return fulfilAll(targets);
  }

  const filterCounts: Record<FilterKey, number> = {
    all:       rows.length,
    waiting:   rows.filter((r) => stateMap[r.orderName]?.status === "pending").length,
    matched:   rows.filter((r) => stateMap[r.orderName]?.status === "matched").length,
    fulfilled: rows.filter((r) => stateMap[r.orderName]?.status === "fulfilled").length,
    error:     rows.filter((r) => stateMap[r.orderName]?.status === "error").length,
    cod:       rows.filter((r) => r.isCod).length,
    paid:      rows.filter((r) => !r.isCod).length,
  };

  const matchedCount = rows.filter(
    (r) => r.ubexId && !r.alreadyFulfilled && stateMap[r.orderName]?.status !== "fulfilled",
  ).length;

  return (
    <div className="space-y-5">
      <UbexStatusLine
        tokenConfigured={ubexTokenConfigured}
        linked={rows.filter((r) => r.ubexId).length}
        total={rows.length}
        rowNoun="order"
        totalShipments={ubexTotalShipments}
        conflictsCount={ubexConflictsCount}
        apiMessage={ubexApiMessage}
        error={ubexError}
      />

      {/* ── Stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Waiting for Ubex"
          count={filterCounts.waiting}
          color="amber"
          active={filter === "waiting"}
          onClick={() => setFilter(filter === "waiting" ? "all" : "waiting")}
        />
        <StatCard
          icon={Send}
          label="Ready to push"
          count={filterCounts.matched}
          color="blue"
          active={filter === "matched"}
          onClick={() => setFilter(filter === "matched" ? "all" : "matched")}
        />
        <StatCard
          icon={CheckCircle}
          label="Fulfilled"
          count={filterCounts.fulfilled}
          color="green"
          active={filter === "fulfilled"}
          onClick={() => setFilter(filter === "fulfilled" ? "all" : "fulfilled")}
        />
        <StatCard
          icon={AlertCircle}
          label="Errors"
          count={filterCounts.error}
          color="red"
          active={filter === "error"}
          onClick={() => setFilter(filter === "error" ? "all" : "error")}
        />
      </div>

      {/* ── Filter tabs ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Fulfillment filter">
        {FILTER_LABELS.map((f) => {
          const active = filter === f.key;
          const count = filterCounts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={[
                "focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition",
                active
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#EBEBEB] bg-white text-[#555555] hover:bg-[#F7F7F7]",
              ].join(" ")}
            >
              <span>{f.label}</span>
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-[#F7F7F7] text-[#999999]",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <FulfillmentTable rows={filteredRows} stateMap={stateMap} onPush={pushRow} />
      <FulfillmentFooter matchedCount={matchedCount} onFulfilAll={handleFulfilAll} />
    </div>
  );
}

export type { RowState, RowStatus };
