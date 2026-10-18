import { formatNumber } from "@/lib/utils";

/** Ranked horizontal bars rendered in plain HTML: labels and values stay in text ink, the bar carries magnitude. */
export function BarList({ items, valueLabel }: { items: { label: React.ReactNode; value: number; sub?: React.ReactNode }[]; valueLabel: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="space-y-3" aria-label={`Ranked by ${valueLabel}`}>
      {items.map((item, idx) => (
        <li key={idx} title={`${item.value.toLocaleString()} ${valueLabel}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-navy-900">{item.label}</span>
            <span className="shrink-0 tabular-nums text-navy-900">
              <span className="font-semibold">{formatNumber(item.value)}</span>
              <span className="ml-1.5 text-xs text-muted">{total ? Math.round((item.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface">
            <div className="h-2 rounded-full bg-series-1" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
          {item.sub && <p className="mt-1 text-xs text-muted">{item.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
