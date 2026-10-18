"use client";
import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps,
} from "recharts";

const AXIS = { stroke: "#94a0b8", fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = "#eef1f6";

type Series = { key: string; label: string; color: string };

function ChartTooltip({ active, payload, label, series }: TooltipProps<number, string> & { series: Series[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-navy-900">{label}</p>
      {series.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key);
        return (
          <div key={s.key} className="flex items-center gap-2 py-0.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums text-navy-900">{(p?.value ?? 0).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: s.color }} aria-hidden />{s.label}
        </span>
      ))}
    </div>
  );
}

function DataTable<T extends Record<string, string | number>>({ data, xKey, series }: { data: T[]; xKey: keyof T; series: Series[] }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer select-none text-muted hover:text-navy-900">Show data table</summary>
      <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface"><tr><th className="px-3 py-1.5 font-medium">Period</th>{series.map((s) => <th key={s.key} className="px-3 py-1.5 text-right font-medium">{s.label}</th>)}</tr></thead>
          <tbody>{data.map((d, i) => <tr key={i} className="border-t border-border"><td className="px-3 py-1.5">{String(d[xKey])}</td>{series.map((s) => <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">{Number(d[s.key]).toLocaleString()}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

/** Time series as thin lines with a soft area under the primary series; crosshair tooltip on hover. */
export function TrendChart<T extends Record<string, string | number>>({ data, series, xKey = "label", height = 280 }: {
  data: T[]; series: Series[]; xKey?: string; height?: number;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <div>
      <Legend series={series} />
      <div style={{ height }} role="img" aria-label={`Line chart of ${series.map((s) => s.label).join(" and ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series[0].color} stopOpacity={0.16} />
                <stop offset="100%" stopColor={series[0].color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey={xKey} {...AXIS} minTickGap={24} />
            <YAxis {...AXIS} allowDecimals={false} width={48} />
            <Tooltip content={<ChartTooltip series={series} />} cursor={{ stroke: "#94a0b8", strokeDasharray: "3 3" }} />
            {series.map((s, i) => (
              <Area key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2}
                fill={i === 0 ? `url(#g-${id})` : "transparent"} dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} isAnimationActive={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <DataTable data={data} xKey={xKey} series={series} />
    </div>
  );
}

export function ColumnChart<T extends Record<string, string | number>>({ data, series, xKey = "label", height = 240 }: {
  data: T[]; series: Series; xKey?: string; height?: number;
}) {
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`Bar chart of ${series.label}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey={xKey} {...AXIS} minTickGap={16} />
            <YAxis {...AXIS} allowDecimals={false} width={48} />
            <Tooltip content={<ChartTooltip series={[series]} />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
            <Bar dataKey={series.key} name={series.label} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable data={data} xKey={xKey} series={[series]} />
    </div>
  );
}
