import Link from "next/link";
import { cn } from "@/lib/utils";
import { RANGES, type RangeKey } from "@/lib/analytics";

export function RangeFilter({ value, basePath }: { value: RangeKey; basePath: string }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-white p-0.5 shadow-sm" role="group" aria-label="Date range">
      {(Object.keys(RANGES) as RangeKey[]).map((k) => (
        <Link key={k} href={`${basePath}?range=${k}`} scroll={false} aria-current={k === value ? "true" : undefined}
          className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", k === value ? "bg-primary text-white shadow-sm" : "text-navy-700 hover:bg-surface")}>
          {RANGES[k]}
        </Link>
      ))}
    </div>
  );
}
