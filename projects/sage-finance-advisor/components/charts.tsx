"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCompact, fmtCurrency } from "@/lib/format";

const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-md">
      {label && <p className="text-[11px] text-ink-3 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-xs text-ink flex items-center gap-1.5 tabular">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color ?? "var(--series-1)" }}
          />
          <span className="text-ink-2">{p.name}:</span> {fmtCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export function NetWorthChart({
  data,
}: {
  data: { date: string; netWorth: number }[];
}) {
  return (
    <div className="h-56 px-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-2)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--series-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--grid)" }}
            tickFormatter={(d: string) =>
              new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtCompact(v)}
            width={52}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }} />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="netWorth"
            name="Net worth"
            stroke="var(--series-2)"
            strokeWidth={2}
            fill="url(#nwFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AllocationDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-2 px-4 pb-4">
      <div className="h-44 w-44 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={SERIES[idx % SERIES.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-ink-3 uppercase tracking-wide">Assets</p>
          <p className="text-sm font-semibold text-ink tabular">{fmtCompact(total)}</p>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 min-w-0">
        {data.map((d, idx) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-[3px] shrink-0"
              style={{ background: SERIES[idx % SERIES.length] }}
            />
            <span className="text-ink-2 truncate">{d.name}</span>
            <span className="ml-auto text-ink font-medium tabular">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
