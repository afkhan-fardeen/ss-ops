"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BarChartPoint = {
  label: string;
  value: number;
};

type Props = {
  data: BarChartPoint[];
  fill: string;
  emptyMessage?: string;
  valueLabel?: string;
};

export function ActivityBarChart({
  data,
  fill,
  emptyMessage = "No activity in this period yet.",
  valueLabel = "Count",
}: Props) {
  const hasData = data.some((d) => d.value > 0);

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
          formatter={(v: number) => [v, valueLabel]}
        />
        <Bar dataKey="value" fill={fill} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
