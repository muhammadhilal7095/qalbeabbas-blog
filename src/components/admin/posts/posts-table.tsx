"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive, ArchiveRestore, Copy, ExternalLink, Eye, FileText, FilePen, ImageOff, MessageSquare, MoreHorizontal, Pencil, SearchX, Send, Star, Trash2,
} from "lucide-react";
import { duplicatePost, postAction } from "@/actions/posts";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { seoTone } from "@/lib/seo";
import { Checkbox } from "@/components/ui/input";
import { Button, buttonClasses } from "@/components/ui/button";
import { PostStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type PostRow = {
  id: string; title: string; slug: string; status: string; featured: boolean; author: string; category: string | null;
  date: string | null; dateLabel: string; views: number; comments: number; seoScore: number;
  thumb: string | null; thumbAlt: string; canEdit: boolean; canDelete: boolean;
};

type Action = "publish" | "draft" | "archive" | "restore" | "delete";

export function PostsTable({ rows, hasFilters, isEmpty, canPublish, canCreate, viewingArchived }: {
  rows: PostRow[]; hasFilters: boolean; isEmpty: boolean; canPublish: boolean; canCreate: boolean; viewingArchived: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => setSelected(new Set()), [rows]);

  const runAction = async (ids: string[], action: Action) => {
    setBusy(true);
    const res = await postAction(ids, action);
    setBusy(false);
    if (res.ok) { toast.success(res.message); setSelected(new Set()); router.refresh(); }
    else toast.error(res.error);
  };

  const request = (ids: string[], action: Action) => {
    if (action === "delete") {
      confirm({
        title: ids.length === 1 ? "Delete this post permanently?" : `Delete ${ids.length} posts permanently?`,
        description: <>This removes the post{ids.length === 1 ? "" : "s"}, {ids.length === 1 ? "its" : "their"} comments and view history. <strong className="text-navy-900">This cannot be undone.</strong> Consider archiving instead.</>,
        confirmLabel: "Delete permanently",
        destructive: true,
        onConfirm: () => runAction(ids, "delete"),
      });
    } else if (action === "archive") {
      confirm({
        title: ids.length === 1 ? "Archive this post?" : `Archive ${ids.length} posts?`,
        description: "Archived posts are removed from the website but kept here. You can restore them at any time.",
        confirmLabel: "Archive",
        onConfirm: () => runAction(ids, "archive"),
      });
    } else void runAction(ids, action);
  };

  const duplicate = async (id: string) => {
    const res = await duplicatePost(id);
    if (res.ok && res.data) { toast.success(res.message); router.push(`/admin/posts/${res.data.id}/edit`); }
    else if (!res.ok) toast.error(res.error);
  };

  if (!rows.length) {
    return isEmpty ? (
      <EmptyState icon={FileText} title="No blog posts yet" description="Start writing your first post. Drafts are saved automatically while you work."
        action={canCreate && <Link href="/admin/posts/new" className={buttonClasses()}><FilePen />Write your first post</Link>} />
    ) : (
      <EmptyState icon={SearchX} title="No posts match" description={hasFilters ? "Try a different search term or clear some filters." : "There are no posts with this status."} />
    );
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const ids = [...selected];

  return (
    <>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft px-4 py-2.5" role="toolbar" aria-label="Bulk actions">
          <span className="mr-2 text-sm font-medium text-primary">{selected.size} selected</span>
          {canPublish && !viewingArchived && <Button size="sm" variant="outline" disabled={busy} onClick={() => request(ids, "publish")}><Send />Publish</Button>}
          {!viewingArchived && <Button size="sm" variant="outline" disabled={busy} onClick={() => request(ids, "draft")}><FilePen />Move to draft</Button>}
          {canPublish && !viewingArchived && <Button size="sm" variant="outline" disabled={busy} onClick={() => request(ids, "archive")}><Archive />Archive</Button>}
          {canPublish && viewingArchived && <Button size="sm" variant="outline" disabled={busy} onClick={() => request(ids, "restore")}><ArchiveRestore />Restore</Button>}
          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" disabled={busy} onClick={() => request(ids, "delete")}><Trash2 />Delete</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="w-10 py-3 pl-4"><Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all posts on this page" /></th>
              <th className="py-3 pr-4">Post</th>
              <th className="px-3 py-3">Author</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Views</th>
              <th className="px-3 py-3 text-right">Comments</th>
              <th className="px-3 py-3">SEO</th>
              <th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const tone = seoTone(r.seoScore);
              return (
                <tr key={r.id} className={cn("group transition-colors hover:bg-surface/60", selected.has(r.id) && "bg-primary-soft/50")}>
                  <td className="py-3 pl-4"><Checkbox checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} /></td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                        {r.thumb ? <img src={r.thumb} alt={r.thumbAlt} className="size-full object-cover" loading="lazy" /> : <ImageOff className="size-4 text-slate-300" aria-label="No featured image" />}
                      </div>
                      <div className="min-w-0 max-w-sm">
                        {r.canEdit
                          ? <Link href={`/admin/posts/${r.id}/edit`} className="line-clamp-2 font-medium text-navy-900 hover:text-primary">{r.title}</Link>
                          : <span className="line-clamp-2 font-medium">{r.title}</span>}
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                          {r.featured && <Star className="size-3 fill-amber-400 text-amber-400" aria-label="Featured" />}/{r.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-navy-700">{r.author}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-navy-700">{r.category ?? <span className="text-muted">Uncategorized</span>}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="block text-navy-900">{formatDate(r.date, r.status === "scheduled")}</span>
                    <span className="text-xs text-muted">{r.dateLabel}</span>
                  </td>
                  <td className="px-3 py-3"><PostStatusBadge status={r.status} /></td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatNumber(r.views)}</td>
                  <td className="px-3 py-3 text-right tabular-nums"><span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5 text-muted" />{r.comments}</span></td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset", tone.className)} title={tone.label}>{r.seoScore}</span>
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonClasses("ghost", "icon-sm")} aria-label={`Actions for ${r.title}`}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {r.canEdit && <DropdownMenuItem asChild><Link href={`/admin/posts/${r.id}/edit`}><Pencil />Edit</Link></DropdownMenuItem>}
                        <DropdownMenuItem asChild><Link href={`/admin/posts/${r.id}/preview`} target="_blank"><Eye />Preview</Link></DropdownMenuItem>
                        {r.status === "published" && <DropdownMenuItem asChild><a href={`/blog/${r.slug}`} target="_blank" rel="noreferrer"><ExternalLink />View on site</a></DropdownMenuItem>}
                        {canCreate && <DropdownMenuItem onSelect={() => duplicate(r.id)}><Copy />Duplicate</DropdownMenuItem>}
                        {canPublish && r.canEdit && (r.status === "archived"
                          ? <DropdownMenuItem onSelect={() => request([r.id], "restore")}><ArchiveRestore />Restore to draft</DropdownMenuItem>
                          : <DropdownMenuItem onSelect={() => request([r.id], "archive")}><Archive />Archive</DropdownMenuItem>)}
                        {r.canDelete && <><DropdownMenuSeparator /><DropdownMenuItem destructive onSelect={() => request([r.id], "delete")}><Trash2 />Delete permanently</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
