"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CombinedDailySeries } from "@/lib/dashboard/load-portal-home-summary";

const FULFILLMENT_FILL = "#4F46E5";
const STOCK_FILL = "#06B6D4";

type Props = {
  data: CombinedDailySeries[];
  showStock: boolean;
};

export function CombinedActivityChart({ data, showStock }: Props) {
  const hasData = data.some(
    (d) => d.fulfillments > 0 || (showStock && d.restocks > 0),
  );

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center text-body-sm text-muted">
        No portal activity in the last 14 days yet.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: d.label,
    fulfillments: d.fulfillments,
    restocks: showStock ? d.restocks : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#64748B" }}
          tickLine={false}
          axisLine={{ stroke: "#E2E8F0" }}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#64748B" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #E2E8F0",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="fulfillments"
          name="Fulfillments"
          fill={FULFILLMENT_FILL}
          radius={[2, 2, 0, 0]}
          maxBarSize={16}
        />
        {showStock ? (
          <Bar
            dataKey="restocks"
            name="Stock restocks"
            fill={STOCK_FILL}
            radius={[2, 2, 0, 0]}
            maxBarSize={16}
          />
        ) : null}
      </BarChart>
    </ResponsiveContainer>
  );
}
