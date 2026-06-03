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

export type StackedChartPoint = {
  label: string;
  success: number;
  error: number;
};

type Props = {
  data: StackedChartPoint[];
  successFill: string;
  errorFill?: string;
  emptyMessage?: string;
};

export function ActivityStackedChart({
  data,
  successFill,
  errorFill = "#C25151",
  emptyMessage = "No activity in this period yet.",
}: Props) {
  const hasData = data.some((d) => d.success > 0 || d.error > 0);

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-[#999999]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#999999" }}
          tickLine={false}
          axisLine={{ stroke: "#EBEBEB" }}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#999999" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #EBEBEB",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (value === "success" ? "Success" : "Error")}
        />
        <Bar dataKey="success" stackId="a" fill={successFill} radius={[0, 0, 0, 0]} maxBarSize={32} />
        <Bar dataKey="error" stackId="a" fill={errorFill} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
