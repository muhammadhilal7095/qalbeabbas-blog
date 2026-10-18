import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export function StatCard({ label, value, icon: Icon, hint, change, href, display }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; hint?: React.ReactNode; change?: number | null; href?: string; display?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-[18px]" /></span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-navy-900">{display ?? formatNumber(value)}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
        {change != null && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", change >= 0 ? "text-emerald-700" : "text-red-700")}>
            {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{Math.abs(change)}%
          </span>
        )}
        {hint}
      </div>
    </>
  );
  const cls = "block rounded-xl border border-border bg-white p-5 shadow-card";
  return href ? <Link href={href} className={cn(cls, "transition-shadow hover:shadow-pop")}>{body}</Link> : <div className={cls}>{body}</div>;
}
