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

export type PipelineChartPoint = {
  label: string;
  submitted: number;
  approved: number;
};

type Props = {
  data: PipelineChartPoint[];
  submittedFill: string;
  approvedFill?: string;
  emptyMessage?: string;
};

export function SubscriptionPipelineChart({
  data,
  submittedFill,
  approvedFill = "#5B8A72",
  emptyMessage = "No pipeline activity in the last 14 days.",
}: Props) {
  const hasData = data.some((d) => d.submitted > 0 || d.approved > 0);

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) =>
            value === "submitted" ? "Submitted" : value === "approved" ? "Approved" : value
          }
        />
        <Bar
          dataKey="submitted"
          fill={submittedFill}
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
        />
        <Bar
          dataKey="approved"
          fill={approvedFill}
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
