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
import { COD_ACCENT } from "@/config/modules";

const FULFILLMENT_FILL = "#C4553A";
const STOCK_FILL = "#6B8A3E";

type Props = {
  data: CombinedDailySeries[];
  showStock: boolean;
};

export function CombinedActivityChart({ data, showStock }: Props) {
  const hasData = data.some(
    (d) => d.codOrders > 0 || d.fulfillments > 0 || (showStock && d.restocks > 0),
  );

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted">
        No portal activity in the last 14 days yet.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: d.label,
    codOrders: d.codOrders,
    fulfillments: d.fulfillments,
    restocks: showStock ? d.restocks : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#8A8880" }}
          tickLine={false}
          axisLine={{ stroke: "#E4E1D8" }}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#8A8880" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #E4E1D8",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="codOrders"
          name="COD orders emailed"
          fill={COD_ACCENT.chartFill}
          radius={[2, 2, 0, 0]}
          maxBarSize={16}
        />
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
