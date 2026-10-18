"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TABS = [
  { value: "", label: "All", key: "all" },
  { value: "published", label: "Published", key: "published" },
  { value: "draft", label: "Drafts", key: "draft" },
  { value: "pending", label: "Pending review", key: "pending" },
  { value: "scheduled", label: "Scheduled", key: "scheduled" },
  { value: "archived", label: "Archived", key: "archived" },
];

/** URL-driven filters: every change updates the query string and the server re-queries. */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = React.useTransition();
  const set = React.useCallback((updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) v ? next.set(k, v) : next.delete(k);
    next.delete("page");
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }, [router, pathname, sp]);
  return { set, pending, sp };
}

export function SearchInput({ value, onSearch, placeholder, pending }: { value?: string; onSearch: (v: string) => void; placeholder: string; pending?: boolean }) {
  const [q, setQ] = React.useState(value ?? "");
  React.useEffect(() => setQ(value ?? ""), [value]);
  React.useEffect(() => {
    if (q === (value ?? "")) return;
    const t = setTimeout(() => onSearch(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q, value, onSearch]);
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9 pr-9" aria-label={placeholder} type="search" />
      {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-label="Loading" />}
    </div>
  );
}

export function PostFilters({ filters, counts, categories, authors }: {
  filters: Record<string, string | undefined>;
  counts: Record<string, number>;
  categories: { id: string; name: string }[];
  authors: { id: string; name: string }[];
}) {
  const { set, pending } = useUrlParams();
  const [open, setOpen] = React.useState(!!(filters.category || filters.author || filters.from || filters.to));
  const activeAdvanced = [filters.category, filters.author, filters.from, filters.to].filter(Boolean).length;

  return (
    <div className="border-b border-border">
      <div className="flex gap-1 overflow-x-auto px-4 pt-3" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => {
          const active = (filters.status ?? "") === t.value;
          return (
            <button key={t.key} role="tab" aria-selected={active} onClick={() => set({ status: t.value || undefined })}
              className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                active ? "border-primary text-primary" : "border-transparent text-muted hover:text-navy-900")}>
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-primary-soft text-primary" : "bg-surface text-muted")}>{counts[t.key] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        <SearchInput value={filters.q} onSearch={(q) => set({ q: q || undefined })} placeholder="Search title or keyword…" pending={pending} />
        <Select value={filters.sort ?? "newest"} onChange={(e) => set({ sort: e.target.value === "newest" ? undefined : e.target.value })} className="w-auto" aria-label="Sort posts">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="views">Most viewed</option>
          <option value="comments">Most commented</option>
          <option value="seo">Best SEO score</option>
          <option value="title">Title A–Z</option>
        </Select>
        <Button variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <SlidersHorizontal />Filters{activeAdvanced > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{activeAdvanced}</span>}
        </Button>
        <Select value={filters.size ?? "10"} onChange={(e) => set({ size: e.target.value === "10" ? undefined : e.target.value })} className="ml-auto w-auto" aria-label="Posts per page">
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
        </Select>
      </div>
      {open && (
        <div className="grid gap-3 border-t border-border bg-surface/50 px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={filters.category ?? ""} onChange={(e) => set({ category: e.target.value || undefined })} aria-label="Category">
            <option value="">All categories</option>
            <option value="none">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {authors.length > 0 && (
            <Select value={filters.author ?? ""} onChange={(e) => set({ author: e.target.value || undefined })} aria-label="Author">
              <option value="">All authors</option>
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          )}
          <label className="flex items-center gap-2 text-sm text-muted">From
            <Input type="date" value={filters.from ?? ""} max={filters.to} onChange={(e) => set({ from: e.target.value || undefined })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">To
            <Input type="date" value={filters.to ?? ""} min={filters.from} onChange={(e) => set({ to: e.target.value || undefined })} />
          </label>
          <Button variant="ghost" onClick={() => set({ category: undefined, author: undefined, from: undefined, to: undefined, q: undefined })}>
            <X />Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
