import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: React.ComponentType<{ className?: string }>; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-3 rounded-full bg-primary-soft" aria-hidden />
        <div className="relative flex size-12 items-center justify-center rounded-xl border border-border bg-white text-primary shadow-card">
          <Icon className="size-6" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-100", className)} aria-hidden />;
}

/** Link-based pagination that preserves the current query string. */
export function Pagination({ page, pageCount, total, pageSize, basePath, params }: {
  page: number; pageCount: number; total: number; pageSize: number; basePath: string; params: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border px-2 text-sm";
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3" aria-label="Pagination">
      <p className="text-sm text-muted">Showing <span className="font-medium text-navy-900">{from}–{to}</span> of <span className="font-medium text-navy-900">{total}</span></p>
      <div className="flex items-center gap-1">
        {page > 1 ? <Link className={cn(btn, "hover:bg-surface")} href={href(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Link>
          : <span className={cn(btn, "opacity-40")}><ChevronLeft className="size-4" /></span>}
        {pages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
            <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(btn, p === page ? "border-primary bg-primary text-white" : "hover:bg-surface")}>{p}</Link>
          </React.Fragment>
        ))}
        {page < pageCount ? <Link className={cn(btn, "hover:bg-surface")} href={href(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Link>
          : <span className={cn(btn, "opacity-40")}><ChevronRight className="size-4" /></span>}
      </div>
    </nav>
  );
}
