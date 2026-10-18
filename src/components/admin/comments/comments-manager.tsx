"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, Clock, ExternalLink, Inbox, MessageSquare, MoreHorizontal, SearchX, ShieldAlert, Trash2, X } from "lucide-react";
import { moderateComments } from "@/actions/comments";
import { cn, formatDate } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/input";
import { CommentStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput, useUrlParams } from "@/components/admin/posts/post-filters";

type Row = {
  id: string; authorName: string; authorEmail: string; authorUrl: string | null; content: string; status: string; createdAt: string;
  post: { id: string; title: string; slug: string; status: string };
};
type Action = "approved" | "pending" | "spam" | "rejected" | "delete";

const TABS = [
  { value: "", label: "All", key: "all", icon: Inbox },
  { value: "pending", label: "Pending", key: "pending", icon: Clock },
  { value: "approved", label: "Approved", key: "approved", icon: Check },
  { value: "spam", label: "Spam", key: "spam", icon: ShieldAlert },
  { value: "rejected", label: "Rejected", key: "rejected", icon: Ban },
];

export function CommentsManager({ comments, counts, posts, filters, hasFilters }: {
  comments: Row[]; counts: Record<string, number>; posts: { id: string; title: string }[];
  filters: { status?: string; q?: string; post?: string; sort: string }; hasFilters: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { set, pending } = useUrlParams();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setSelected(new Set()), [comments]);

  const act = async (ids: string[], action: Action) => {
    const go = async () => {
      setBusy(true);
      const res = await moderateComments(ids, action);
      setBusy(false);
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    };
    if (action === "delete") {
      confirm({ title: ids.length === 1 ? "Delete this comment?" : `Delete ${ids.length} comments?`, description: "Deleted comments can't be recovered.", confirmLabel: "Delete", destructive: true, onConfirm: go });
    } else await go();
  };

  const all = comments.length > 0 && comments.every((c) => selected.has(c.id));
  const ids = [...selected];

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => {
          const active = (filters.status ?? "") === t.value;
          return (
            <button key={t.key} role="tab" aria-selected={active} onClick={() => set({ status: t.value || undefined })}
              className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium", active ? "border-primary text-primary" : "border-transparent text-muted hover:text-navy-900")}>
              <t.icon className="size-4" />{t.label}
              <span className={cn("rounded-full px-1.5 text-xs", t.key === "pending" && (counts.pending ?? 0) > 0 ? "bg-amber-100 text-amber-800" : active ? "bg-primary-soft text-primary" : "bg-surface text-muted")}>{counts[t.key] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <SearchInput value={filters.q} onSearch={(v) => set({ q: v || undefined })} placeholder="Search author, email or text…" pending={pending} />
        <Select value={filters.post ?? ""} onChange={(e) => set({ post: e.target.value || undefined })} className="w-auto max-w-64" aria-label="Filter by post">
          <option value="">All posts</option>
          {posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
        <Select value={filters.sort} onChange={(e) => set({ sort: e.target.value === "newest" ? undefined : e.target.value })} className="w-auto" aria-label="Sort comments">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft px-4 py-2.5" role="toolbar" aria-label="Bulk moderation">
          <span className="mr-2 text-sm font-medium text-primary">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(ids, "approved")}><Check />Approve</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(ids, "rejected")}><X />Reject</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(ids, "spam")}><ShieldAlert />Spam</Button>
          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" disabled={busy} onClick={() => act(ids, "delete")}><Trash2 />Delete</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      {comments.length === 0 ? (
        counts.all === 0
          ? <EmptyState icon={MessageSquare} title="No comments yet" description="When readers comment on your published posts, they'll appear here for moderation." />
          : <EmptyState icon={hasFilters ? SearchX : Inbox} title={hasFilters ? "No comments match" : "Nothing here"} description={hasFilters ? "Try a different search or post filter." : filters.status === "pending" ? "You're all caught up. No comments are waiting for moderation." : "No comments with this status."} />
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-border bg-surface/60 px-4 py-2">
            <Checkbox checked={all} onChange={() => setSelected(all ? new Set() : new Set(comments.map((c) => c.id)))} aria-label="Select all comments on this page" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Select all</span>
          </div>
          <ul className="divide-y divide-border">
            {comments.map((c) => (
              <li key={c.id} className={cn("flex gap-3 px-4 py-4", selected.has(c.id) && "bg-primary-soft/50", c.status === "pending" && !selected.has(c.id) && "bg-amber-50/40")}>
                <Checkbox className="mt-1" checked={selected.has(c.id)} aria-label={`Select comment by ${c.authorName}`}
                  onChange={() => setSelected((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} />
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{c.authorName.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold">{c.authorName}</span>
                    <a href={`mailto:${c.authorEmail}`} className="text-muted hover:text-primary">{c.authorEmail}</a>
                    {c.authorUrl && <a href={c.authorUrl} target="_blank" rel="noreferrer nofollow" className="truncate text-xs text-muted hover:text-primary">{c.authorUrl}</a>}
                    <CommentStatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(c.createdAt, true)} · on <Link href={`/admin/posts/${c.post.id}/edit`} className="font-medium text-navy-700 hover:text-primary">{c.post.title}</Link>
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-navy-800">{c.content}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.status !== "approved" && <Button size="sm" variant="outline" className="text-emerald-700" disabled={busy} onClick={() => act([c.id], "approved")}><Check />Approve</Button>}
                    {c.status !== "rejected" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => act([c.id], "rejected")}><X />Reject</Button>}
                    {c.status !== "spam" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => act([c.id], "spam")}><ShieldAlert />Spam</Button>}
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonClasses("ghost", "icon-sm")} aria-label="More actions"><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {c.status !== "pending" && <DropdownMenuItem onSelect={() => act([c.id], "pending")}><Clock />Move to pending</DropdownMenuItem>}
                        {c.post.status === "published" && <DropdownMenuItem asChild><a href={`/blog/${c.post.slug}#comments-heading`} target="_blank" rel="noreferrer"><ExternalLink />View post</a></DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => act([c.id], "delete")}><Trash2 />Delete permanently</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
