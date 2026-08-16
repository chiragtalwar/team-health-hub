import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Point } from "@/lib/health-data";

const toneVar: Record<string, string> = {
  recovery: "var(--recovery)",
  strain: "var(--strain)",
  sleep: "var(--sleep)",
  glucose: "var(--glucose)",
};

export function TrendArea({
  data,
  tone = "recovery",
  height = 92,
}: {
  data: Point[];
  tone?: keyof typeof toneVar;
  height?: number;
}) {
  const color = toneVar[tone]!;
  const id = `grad-${tone}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TeamCompareChart({
  data,
  height = 240,
}: {
  data: { t: string; you: number; mate: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--grid)" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="t"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--popover-foreground)",
            }}
          />
          <Line
            type="monotone"
            dataKey="you"
            stroke="var(--recovery)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--recovery)", strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="mate"
            stroke="var(--sleep)"
            strokeWidth={2.5}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: "var(--sleep)", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
