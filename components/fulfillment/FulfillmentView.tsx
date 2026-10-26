"use client";

import { useMemo, useState } from "react";
import { Clock, CheckCircle, Send, AlertCircle } from "lucide-react";
import { useUrlViewState } from "@/hooks/useUrlViewState";
import type { OrderRow } from "@/lib/orders/build-order-rows";
import { UbexStatusLine } from "@/components/fulfillment/UbexStatusLine";
import type { InitialLogEntry, RowStateMap } from "@/hooks/useRowPushQueue";
import { useRowPushQueue } from "@/hooks/useRowPushQueue";
import { FulfillmentTable } from "./FulfillmentTable";
import { FulfillmentFooter } from "./FulfillmentFooter";

type FilterKey = "all" | "cod" | "paid" | "waiting" | "matched" | "fulfilled" | "error";

const FILTER_KEYS: FilterKey[] = ["all", "cod", "paid", "waiting", "matched", "fulfilled", "error"];

function isFilterKey(value: string | null): value is FilterKey {
  return FILTER_KEYS.includes(value as FilterKey);
}

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
  shortLabel,
  count,
  color,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  /** Shown on phones, where the tile is narrow. */
  shortLabel?: string;
  count: number;
  color: "amber" | "blue" | "green" | "red" | "neutral";
  active: boolean;
  onClick: () => void;
}) {
  const colors = {
    amber:   { iconBg: "bg-[rgba(217,119,6,0.12)]", iconText: "text-[#B45309]", num: "text-[#B45309]", ring: "ring-[#B45309]" },
    blue:    { iconBg: "bg-[rgba(59,130,246,0.10)]",  iconText: "text-[#2563EB]", num: "text-[#2563EB]", ring: "ring-[#2563EB]" },
    green:   { iconBg: "bg-[rgba(22,163,74,0.12)]",   iconText: "text-[#15803D]", num: "text-[#15803D]", ring: "ring-[#15803D]" },
    red:     { iconBg: "bg-[rgba(220,38,38,0.12)]",   iconText: "text-[#DC2626]", num: "text-[#DC2626]", ring: "ring-[#DC2626]" },
    neutral: { iconBg: "bg-canvas",                   iconText: "text-muted",     num: "text-ink",       ring: "ring-ink" },
  };
  const c = colors[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-w-0 flex-1 items-center gap-3 rounded-card border border-line bg-white p-3 text-left transition md:p-4",
        active ? `${c.ring} ring-2 shadow-soft` : "hover:shadow-soft",
      ].join(" ")}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full md:h-9 md:w-9 ${c.iconBg}`}>
        <Icon size={16} className={c.iconText} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className={`text-xl font-semibold leading-tight tabular-nums ${c.num}`}>{count}</p>
        <p className="truncate text-fs12 font-medium text-muted">
          {shortLabel ? (
            <>
              <span className="md:hidden">{shortLabel}</span>
              <span className="hidden md:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </p>
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
  pushEndpoint,
}: {
  rows: OrderRow[];
  ubexTokenConfigured: boolean;
  ubexTotalShipments?: number;
  ubexConflictsCount?: number;
  ubexApiMessage?: string;
  ubexError?: string;
  initialLogs?: InitialLogEntry[];
  /** API route to POST fulfillments to. Defaults to "/api/fulfill". Pass "/api/store2/fulfill" for Store 2. */
  pushEndpoint?: string;
}) {
  const { stateMap, pushOne, fulfilAll } = useRowPushQueue<OrderRow>(rows, initialLogs, pushEndpoint);
  const { searchParams, updateUrl } = useUrlViewState();
  const [filter, setFilterState] = useState<FilterKey>(() => {
    const param = searchParams.get("filter");
    return isFilterKey(param) ? param : "all";
  });

  function setFilter(next: FilterKey) {
    setFilterState(next);
    updateUrl({ filter: next === "all" ? null : next });
  }

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
    <div className="space-y-5 pb-20 md:pb-16">
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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:gap-3">
        <StatCard
          icon={Clock}
          label="Waiting for Ubex"
          shortLabel="Waiting"
          count={filterCounts.waiting}
          color="amber"
          active={filter === "waiting"}
          onClick={() => setFilter(filter === "waiting" ? "all" : "waiting")}
        />
        <StatCard
          icon={Send}
          label="Ready to push"
          shortLabel="Ready"
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
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="tablist" aria-label="Fulfillment filter">
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
                "focus-ring inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-fs13 font-medium transition md:h-8 md:px-3 md:text-fs12",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-muted hover:bg-canvas",
              ].join(" ")}
            >
              <span>{f.label}</span>
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-fs11 font-medium tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-canvas text-muted",
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
