"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Combine, MoreHorizontal, Pencil, Plus, SearchX, Tags, Trash2 } from "lucide-react";
import { deleteTags, mergeTags, saveTag } from "@/actions/taxonomy";
import { slugify, validateSlug } from "@/lib/slug";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput, useUrlParams } from "@/components/admin/posts/post-filters";

type Tag = { id: string; name: string; slug: string; posts: number };

export function TagManager({ tags, q, sort, isEmpty }: { tags: Tag[]; q?: string; sort: string; isEmpty: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { set, pending } = useUrlParams();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [editing, setEditing] = React.useState<Tag | "new" | null>(null);
  const [merging, setMerging] = React.useState(false);
  React.useEffect(() => setSelected(new Set()), [tags]);

  const remove = (items: Tag[]) => {
    const posts = items.reduce((s, t) => s + t.posts, 0);
    confirm({
      title: items.length === 1 ? `Delete tag “${items[0].name}”?` : `Delete ${items.length} tags?`,
      description: posts ? `The tag${items.length === 1 ? " is" : "s are"} used on ${posts} post${posts === 1 ? "" : "s"}. ${items.length === 1 ? "It" : "They"} will be removed from those posts; the posts themselves won't be changed.` : "No posts use these tags.",
      confirmLabel: "Delete", destructive: true,
      onConfirm: async () => {
        const res = await deleteTags(items.map((t) => t.id));
        if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
      },
    });
  };

  const all = tags.length > 0 && tags.every((t) => selected.has(t.id));
  const sel = tags.filter((t) => selected.has(t.id));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <SearchInput value={q} onSearch={(v) => set({ q: v || undefined })} placeholder="Search tags…" pending={pending} />
        <Select value={sort} onChange={(e) => set({ sort: e.target.value === "name" ? undefined : e.target.value })} className="w-auto" aria-label="Sort tags">
          <option value="name">Name A–Z</option>
          <option value="posts">Most used</option>
          <option value="newest">Newest</option>
        </Select>
        <Button className="ml-auto" onClick={() => setEditing("new")}><Plus />Add tag</Button>
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft px-4 py-2.5">
          <span className="mr-2 text-sm font-medium text-primary">{selected.size} selected</span>
          {selected.size > 1 && <Button size="sm" variant="outline" onClick={() => setMerging(true)}><Combine />Merge</Button>}
          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => remove(sel)}><Trash2 />Delete</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      {tags.length === 0 ? (
        isEmpty
          ? <EmptyState icon={Tags} title="No tags yet" description="Tags can also be created right from the post editor." action={<Button onClick={() => setEditing("new")}><Plus />Create a tag</Button>} />
          : <EmptyState icon={SearchX} title="No matching tags" description="Try a different search." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="w-10 py-3 pl-4"><Checkbox checked={all} onChange={() => setSelected(all ? new Set() : new Set(tags.map((t) => t.id)))} aria-label="Select all tags" /></th>
              <th className="px-3 py-3">Name</th><th className="px-3 py-3">Slug</th><th className="px-3 py-3 text-right">Posts</th><th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {tags.map((t) => (
                <tr key={t.id} className="hover:bg-surface/60">
                  <td className="py-3 pl-4"><Checkbox checked={selected.has(t.id)} aria-label={`Select ${t.name}`}
                    onChange={() => setSelected((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })} /></td>
                  <td className="px-3 py-3 font-medium"><button onClick={() => setEditing(t)} className="hover:text-primary">{t.name}</button></td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">{t.slug}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.posts}</td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonClasses("ghost", "icon-sm")} aria-label={`Actions for ${t.name}`}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setEditing(t)}><Pencil />Edit</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/blog?tag=${t.slug}`} target="_blank"><Tags />View on site</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => remove([t])}><Trash2 />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TagDialog key={editing === "new" ? "new" : editing?.id ?? "none"} tag={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />
      <MergeDialog open={merging} tags={sel} onClose={() => setMerging(false)} onDone={() => { setMerging(false); router.refresh(); }} />
    </>
  );
}

function TagDialog({ tag, onClose, onSaved }: { tag: Tag | "new" | null; onClose: () => void; onSaved: () => void }) {
  const existing = tag && tag !== "new" ? tag : null;
  const [name, setName] = React.useState(existing?.name ?? "");
  const [slug, setSlug] = React.useState(existing?.slug ?? "");
  const [touched, setTouched] = React.useState(!!existing);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    const se = validateSlug(slug); if (se) errs.slug = se;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const res = await saveTag({ id: existing?.id, name, slug });
    setSaving(false);
    if (res.ok) { toast.success(res.message); onSaved(); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };
  return (
    <Dialog open={tag !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={existing ? "Edit tag" : "Add tag"} size="sm">
        <form onSubmit={submit} noValidate>
          <div className="space-y-4 p-5">
            <Field label="Name" htmlFor="tag-name" error={errors.name}>
              <Input id="tag-name" value={name} autoFocus maxLength={50} aria-invalid={!!errors.name} onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} />
            </Field>
            <Field label="Slug" htmlFor="tag-slug" error={errors.slug}>
              <Input id="tag-slug" value={slug} className="font-mono text-xs" aria-invalid={!!errors.slug} onChange={(e) => { setTouched(true); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{existing ? "Save changes" : "Create tag"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({ open, tags, onClose, onDone }: { open: boolean; tags: Tag[]; onClose: () => void; onDone: () => void }) {
  const [target, setTarget] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) setTarget(tags[0]?.id ?? ""); }, [open, tags]);
  const go = async () => {
    setBusy(true);
    const res = await mergeTags(tags.map((t) => t.id), target);
    setBusy(false);
    if (res.ok) { toast.success(res.message); onDone(); } else toast.error(res.error);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title="Merge tags" description="Posts tagged with any selected tag will be tagged with the one you keep. The others are deleted." size="sm">
        <div className="p-5">
          <Field label="Keep this tag" htmlFor="merge-target">
            <Select id="merge-target" value={target} onChange={(e) => setTarget(e.target.value)}>
              {tags.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.posts} posts)</option>)}
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={go} loading={busy}><Combine />Merge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
