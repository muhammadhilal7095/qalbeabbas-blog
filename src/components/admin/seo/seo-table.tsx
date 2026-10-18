"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, SearchCheck, X } from "lucide-react";
import { updatePostSeo } from "@/actions/seo";
import { META_DESC_RANGE, META_TITLE_RANGE, seoTone } from "@/lib/seo";
import { validateSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/input";
import { PostStatusBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { SearchInput, useUrlParams } from "@/components/admin/posts/post-filters";

type Row = {
  id: string; title: string; slug: string; status: string; seoScore: number; metaTitle: string | null; metaDescription: string | null;
  focusKeyword: string | null; canonicalUrl: string | null; noIndex: boolean; noFollow: boolean; featuredImageId: string | null;
};

const Mark = ({ ok, label }: { ok: boolean; label: string }) => ok
  ? <Check className="mx-auto size-4 text-emerald-600" aria-label={`${label}: set`} />
  : <X className="mx-auto size-4 text-red-500" aria-label={`${label}: missing`} />;

export function SeoTable({ posts, issue, q, siteUrl }: { posts: Row[]; issue?: string; q?: string; siteUrl: string }) {
  const { set, pending } = useUrlParams();
  const [editing, setEditing] = React.useState<Row | null>(null);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <SearchInput value={q} onSearch={(v) => set({ q: v || undefined })} placeholder="Search posts…" pending={pending} />
        <Select value={issue ?? ""} onChange={(e) => set({ issue: e.target.value || undefined })} className="w-auto" aria-label="Filter by issue">
          <option value="">All posts</option>
          <option value="poor">Score below 50</option>
          <option value="desc">Missing meta description</option>
          <option value="keyword">Missing focus keyword</option>
          <option value="image">Missing featured image</option>
          <option value="noindex">Hidden from search</option>
        </Select>
      </div>
      {posts.length === 0 ? (
        <EmptyState icon={SearchCheck} title={issue ? "No posts with this issue" : "No posts to analyze"} description={issue ? "Nice work. Everything here is in good shape." : "Create posts to see their SEO health."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Post</th><th className="px-3 py-3">Score</th><th className="px-3 py-3 text-center">Title</th><th className="px-3 py-3 text-center">Description</th><th className="px-3 py-3">Keyword</th><th className="px-3 py-3">Indexing</th><th className="w-12 px-3 py-3"><span className="sr-only">Edit</span></th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {posts.map((p) => {
                const tone = seoTone(p.seoScore);
                return (
                  <tr key={p.id} className="hover:bg-surface/60">
                    <td className="max-w-xs px-4 py-3">
                      <Link href={`/admin/posts/${p.id}/edit`} className="line-clamp-1 font-medium hover:text-primary">{p.title}</Link>
                      <div className="mt-0.5 flex items-center gap-2"><span className="truncate text-xs text-muted">/{p.slug}</span><PostStatusBadge status={p.status} /></div>
                    </td>
                    <td className="px-3 py-3"><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset", tone.className)}>{p.seoScore}</span></td>
                    <td className="px-3 py-3"><Mark ok={!!p.metaTitle} label="Meta title" /></td>
                    <td className="px-3 py-3"><Mark ok={!!p.metaDescription} label="Meta description" /></td>
                    <td className="max-w-40 truncate px-3 py-3">{p.focusKeyword || <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-3 text-xs">{p.noIndex ? <span className="font-medium text-amber-700">noindex</span> : <span className="text-emerald-700">index</span>}{p.noFollow && <span className="text-muted">, nofollow</span>}</td>
                    <td className="px-3 py-3"><Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label={`Edit SEO for ${p.title}`}><Pencil /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && <SeoDialog key={editing.id} post={editing} siteUrl={siteUrl} onClose={() => setEditing(null)} />}
    </>
  );
}

function SeoDialog({ post, siteUrl, onClose }: { post: Row; siteUrl: string; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = React.useState({
    slug: post.slug, metaTitle: post.metaTitle ?? "", metaDescription: post.metaDescription ?? "", focusKeyword: post.focusKeyword ?? "",
    canonicalUrl: post.canonicalUrl ?? "", noIndex: post.noIndex, noFollow: post.noFollow,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const se = validateSlug(f.slug);
    if (se) { setErrors({ slug: se }); return; }
    setSaving(true);
    const res = await updatePostSeo({ id: post.id, ...f });
    setSaving(false);
    if (res.ok) { toast.success(res.message); onClose(); router.refresh(); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Edit SEO" description={post.title}>
        <form onSubmit={save} noValidate>
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-border p-3">
              <p className="truncate text-xs text-[#4d5156]">{siteUrl.replace(/^https?:\/\//, "")} › blog › {f.slug}</p>
              <p className="line-clamp-1 text-base text-[#1a0dab]">{f.metaTitle || post.title}</p>
              <p className="line-clamp-2 text-sm text-[#4d5156]">{f.metaDescription || "No meta description; search engines will pick text from the page."}</p>
            </div>
            <Field label="URL slug" htmlFor="s-slug" error={errors.slug} hint={post.status === "published" ? "Changing the slug of a published post breaks existing links." : undefined}>
              <Input id="s-slug" value={f.slug} className="font-mono text-xs" onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} aria-invalid={!!errors.slug} />
            </Field>
            <Field label="Focus keyword" htmlFor="s-kw"><Input id="s-kw" value={f.focusKeyword} onChange={(e) => setF({ ...f, focusKeyword: e.target.value })} /></Field>
            <Field label="Meta title" htmlFor="s-title" error={errors.metaTitle} aside={<span className="text-xs text-muted">{f.metaTitle.length}/{META_TITLE_RANGE[1]}</span>}>
              <Input id="s-title" value={f.metaTitle} maxLength={120} placeholder={post.title} onChange={(e) => setF({ ...f, metaTitle: e.target.value })} />
            </Field>
            <Field label="Meta description" htmlFor="s-desc" error={errors.metaDescription} aside={<span className="text-xs text-muted">{f.metaDescription.length}/{META_DESC_RANGE[1]}</span>}>
              <Textarea id="s-desc" value={f.metaDescription} maxLength={320} rows={3} onChange={(e) => setF({ ...f, metaDescription: e.target.value })} />
            </Field>
            <Field label="Canonical URL" htmlFor="s-canon" error={errors.canonicalUrl}><Input id="s-canon" type="url" value={f.canonicalUrl} onChange={(e) => setF({ ...f, canonicalUrl: e.target.value })} /></Field>
            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2"><Switch checked={!f.noIndex} onCheckedChange={(v) => setF({ ...f, noIndex: !v })} label="Allow indexing" />Allow indexing</label>
              <label className="flex items-center gap-2"><Switch checked={!f.noFollow} onCheckedChange={(v) => setF({ ...f, noFollow: !v })} label="Follow links" />Follow links</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Save SEO</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
