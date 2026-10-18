"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CornerDownRight, FolderTree, MoreHorizontal, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/actions/taxonomy";
import { slugify, validateSlug } from "@/lib/slug";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Cat = { id: string; name: string; slug: string; description: string | null; parentId: string | null; depth: number; posts: number };

export function CategoryManager({ categories, uncategorized }: { categories: Cat[]; uncategorized: number }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState<Cat | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<Cat | null>(null);
  const filtered = q ? categories.filter((c) => `${c.name} ${c.slug} ${c.description ?? ""}`.toLowerCase().includes(q.toLowerCase())) : categories;
  const childCount = (id: string) => categories.filter((c) => c.parentId === id).length;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" className="pl-9" aria-label="Search categories" type="search" />
        </div>
        <span className="text-sm text-muted">{categories.length} categories · {uncategorized} uncategorized post{uncategorized === 1 ? "" : "s"}</span>
        <Button className="ml-auto" onClick={() => setEditing("new")}><Plus />Add category</Button>
      </div>
      {categories.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" description="Create categories like “Tutorials” or “News” to organize your posts and help readers browse."
          action={<Button onClick={() => setEditing("new")}><Plus />Create your first category</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="No matching categories" description="Try a different search." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th><th className="px-3 py-3">Slug</th><th className="px-3 py-3">Description</th><th className="px-3 py-3 text-right">Posts</th><th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-medium" style={{ paddingLeft: q ? 0 : c.depth * 20 }}>
                      {c.depth > 0 && !q && <CornerDownRight className="size-3.5 text-slate-300" aria-hidden />}
                      <button onClick={() => setEditing(c)} className="text-left hover:text-primary">{c.name}</button>
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">{c.slug}</td>
                  <td className="max-w-xs truncate px-3 py-3 text-navy-700">{c.description || <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <Link href={`/admin/posts?category=${c.id}`} className="hover:text-primary hover:underline">{c.posts}</Link>
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonClasses("ghost", "icon-sm")} aria-label={`Actions for ${c.name}`}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setEditing(c)}><Pencil />Edit</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/admin/posts?category=${c.id}`}><FolderTree />View posts</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setDeleting(c)}><Trash2 />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CategoryDialog key={editing === "new" ? "new" : editing?.id ?? "none"} category={editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />
      <DeleteCategoryDialog category={deleting} categories={categories} childCount={deleting ? childCount(deleting.id) : 0} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); router.refresh(); }} />
    </Card>
  );
}

function descendantIds(id: string, all: Cat[]): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) if (c.parentId && out.has(c.parentId) && !out.has(c.id)) { out.add(c.id); grew = true; }
  }
  return out;
}

function CategoryDialog({ category, categories, onClose, onSaved }: { category: Cat | "new" | null; categories: Cat[]; onClose: () => void; onSaved: () => void }) {
  const existing = category && category !== "new" ? category : null;
  const [name, setName] = React.useState(existing?.name ?? "");
  const [slug, setSlug] = React.useState(existing?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(!!existing);
  const [description, setDescription] = React.useState(existing?.description ?? "");
  const [parentId, setParentId] = React.useState(existing?.parentId ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const excluded = existing ? descendantIds(existing.id, categories) : new Set<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    const se = validateSlug(slug); if (se) errs.slug = se;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const res = await saveCategory({ id: existing?.id, name, slug, description, parentId: parentId || null });
    setSaving(false);
    if (res.ok) { toast.success(res.message); onSaved(); }
    else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };

  return (
    <Dialog open={category !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={existing ? "Edit category" : "Add category"}>
        <form onSubmit={submit} noValidate>
          <div className="space-y-4 p-5">
            <Field label="Name" htmlFor="cat-name" error={errors.name}>
              <Input id="cat-name" value={name} autoFocus maxLength={80} aria-invalid={!!errors.name}
                onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
            </Field>
            <Field label="Slug" htmlFor="cat-slug" error={errors.slug} hint={`Used in URLs: /blog?category=${slug || "…"}`}>
              <Input id="cat-slug" value={slug} className="font-mono text-xs" aria-invalid={!!errors.slug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }} />
            </Field>
            <Field label="Parent category" htmlFor="cat-parent" error={errors.parentId} hint="Nest this category under another one.">
              <Select id="cat-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">None (top level)</option>
                {categories.filter((c) => !excluded.has(c.id)).map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Description" htmlFor="cat-desc" error={errors.description}>
              <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{existing ? "Save changes" : "Create category"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({ category, categories, childCount, onClose, onDeleted }: {
  category: Cat | null; categories: Cat[]; childCount: number; onClose: () => void; onDeleted: () => void;
}) {
  const [target, setTarget] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setTarget(""), [category]);
  if (!category) return null;
  const go = async () => {
    setBusy(true);
    const res = await deleteCategory(category.id, target || null);
    setBusy(false);
    if (res.ok) { toast.success(res.message); onDeleted(); } else toast.error(res.error);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={`Delete “${category.name}”?`} size="sm">
        <div className="space-y-4 p-5 text-sm">
          {category.posts > 0 ? (
            <>
              <p className="text-navy-700">This category contains <strong>{category.posts} post{category.posts === 1 ? "" : "s"}</strong>. Choose where they should go. No posts will be deleted.</p>
              <Field label="Move posts to" htmlFor="reassign">
                <Select id="reassign" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Uncategorized</option>
                  {categories.filter((c) => c.id !== category.id).map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.name}</option>)}
                </Select>
              </Field>
            </>
          ) : <p className="text-navy-700">No posts use this category.</p>}
          {childCount > 0 && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Its {childCount} subcategor{childCount === 1 ? "y" : "ies"} will move up one level.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={go} loading={busy}><Trash2 />Delete category</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
