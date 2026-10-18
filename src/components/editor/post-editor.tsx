"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarClock, Check, Clock, Eye, FileText, ImagePlus, Loader2, RefreshCw, Send, Star, Undo2, X,
} from "lucide-react";
import { savePost } from "@/actions/posts";
import type { MediaItem } from "@/actions/media";
import type { PostInput } from "@/lib/validation";
import { slugify, validateSlug } from "@/lib/slug";
import { countWords, cn, formatDate, readingTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/input";
import { PostStatusBadge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPicker } from "./media-picker";
import { SeoPanel, type SeoState } from "./seo-panel";
import { TagInput, type TagValue } from "./tag-input";

export type EditorPost = {
  id: string | null;
  title: string; slug: string; content: string; excerpt: string;
  status: string; featured: boolean;
  categoryId: string; tags: TagValue[]; authorId: string;
  featuredImage: MediaItem | null;
  scheduledAt: string; // datetime-local value
  publishedAt: string | null;
  updatedAt: string | null;
  seo: SeoState;
};

type Props = {
  initial: EditorPost;
  categories: { id: string; name: string; depth: number }[];
  tags: { id: string; name: string }[];
  authors: { id: string; name: string }[];
  perms: { canPublish: boolean; canAssignAuthor: boolean; canUpload: boolean };
  siteUrl: string;
  titleSuffix: string;
  /** Scheduled time as ISO; converted to the browser's local time on mount. */
  scheduledAtIso?: string | null;
};

type Intent = PostInput["intent"];
const AUTOSAVE_MS = 30_000;

const snapshot = (p: EditorPost) => JSON.stringify({ ...p, updatedAt: null, publishedAt: null, status: null });

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditor({ initial, categories, tags, authors, perms, siteUrl, titleSuffix, scheduledAtIso }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [post, setPost] = React.useState<EditorPost>(initial);
  const [saved, setSaved] = React.useState(() => snapshot(initial));
  const [slugTouched, setSlugTouched] = React.useState(!!initial.id);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<Intent | null>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(initial.updatedAt ? new Date(initial.updatedAt) : null);
  const [plainText, setPlainText] = React.useState("");
  const [scheduleMode, setScheduleMode] = React.useState(initial.status === "scheduled");
  const [picker, setPicker] = React.useState<"featured" | "og" | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const contentReady = React.useRef(false);

  const dirty = snapshot(post) !== saved;
  const words = countWords(plainText);
  const minutes = readingTime(words);
  const isLive = post.status === "published";
  const isScheduled = post.status === "scheduled";
  const autosaveEligible = !post.id || post.status === "draft" || post.status === "pending";

  React.useEffect(() => {
    if (!scheduledAtIso) return;
    const local = toLocalInput(new Date(scheduledAtIso));
    setPost((p) => ({ ...p, scheduledAt: local }));
    setSaved((s) => JSON.stringify({ ...JSON.parse(s), scheduledAt: local }));
  }, [scheduledAtIso]);

  const update = React.useCallback((patch: Partial<EditorPost>) => setPost((p) => ({ ...p, ...patch })), []);

  const onTitle = (title: string) => {
    update({ title, ...(slugTouched ? {} : { slug: slugify(title) }) });
    if (errors.title) setErrors(({ title: _, ...rest }) => rest);
  };

  const onContent = React.useCallback((html: string, text: string) => {
    setPlainText(text);
    setPost((p) => ({ ...p, content: html }));
    // The editor normalises HTML on load (e.g. "" -> "<p></p>"); treat that as the saved baseline.
    if (!contentReady.current) {
      contentReady.current = true;
      setSaved((s) => JSON.stringify({ ...JSON.parse(s), content: html }));
    }
  }, []);

  const doSave = React.useCallback(async (intent: Intent, current: EditorPost) => {
    const slugError = validateSlug(current.slug);
    const clientErrors: Record<string, string> = {};
    if (!current.title.trim()) clientErrors.title = "Title is required.";
    if (slugError) clientErrors.slug = slugError;
    if (intent === "schedule" || (intent === "update" && current.status === "scheduled")) {
      if (!current.scheduledAt) clientErrors.scheduledAt = "Pick a date and time.";
      else if (new Date(current.scheduledAt).getTime() <= Date.now() + 60_000) clientErrors.scheduledAt = "Must be at least a minute in the future.";
    }
    if (Object.keys(clientErrors).length) {
      if (intent !== "autosave") { setErrors(clientErrors); toast.error(Object.values(clientErrors)[0]); }
      return false;
    }

    setSaving(intent);
    const payload: PostInput = {
      id: current.id, title: current.title, slug: current.slug, content: current.content, excerpt: current.excerpt,
      categoryId: current.categoryId || null, tagIds: current.tags.filter((t) => t.id).map((t) => t.id!),
      newTags: current.tags.filter((t) => !t.id).map((t) => t.name), authorId: current.authorId || null,
      featured: current.featured, featuredImageId: current.featuredImage?.id ?? null, ogImageId: current.seo.ogImage?.id ?? null,
      metaTitle: current.seo.metaTitle, metaDescription: current.seo.metaDescription, focusKeyword: current.seo.focusKeyword,
      canonicalUrl: current.seo.canonicalUrl, noIndex: current.seo.noIndex, noFollow: current.seo.noFollow,
      scheduledAt: current.scheduledAt ? new Date(current.scheduledAt).toISOString() : null,
      intent, baseUpdatedAt: current.updatedAt,
    };
    let res: Awaited<ReturnType<typeof savePost>>;
    try {
      res = await savePost(payload);
    } catch {
      setSaving(null);
      if (intent !== "autosave") toast.error("Couldn't reach the server. Check your connection and try again.");
      return false;
    }
    setSaving(null);
    if (!res.ok) {
      if (intent !== "autosave") { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
      return false;
    }
    const d = res.data!;
    const next: EditorPost = { ...current, id: d.id, slug: d.slug, status: d.status, updatedAt: d.updatedAt, tags: current.tags };
    // Newly created tags now have ids; they'll be resolved on the next load, keep names stable meanwhile.
    setPost((p) => ({ ...p, id: d.id, slug: d.slug, status: d.status, updatedAt: d.updatedAt }));
    setSaved(snapshot(next));
    setErrors({});
    setLastSavedAt(new Date());
    if (!current.id) window.history.replaceState(null, "", `/admin/posts/${d.id}/edit`);
    if (intent !== "autosave") {
      toast.success(res.message, d.status === "published" ? { action: { label: "View post", onClick: () => window.open(`/blog/${d.slug}`, "_blank") } } : undefined);
      router.refresh();
    }
    if (d.status !== "scheduled") setScheduleMode(false);
    return true;
  }, [router]);

  // Autosave drafts after a period of inactivity.
  const postRef = React.useRef(post);
  postRef.current = post;
  React.useEffect(() => {
    if (!dirty || !autosaveEligible || saving || !post.title.trim()) return;
    const t = setTimeout(() => void doSave("autosave", postRef.current), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [post, dirty, autosaveEligible, saving, doSave]);

  // Unsaved-changes protection: browser close/reload and in-app link clicks.
  React.useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || !a.href || a.href.startsWith("javascript")) return;
      if (new URL(a.href).pathname === window.location.pathname) return;
      if (!window.confirm("You have unsaved changes. Leave this page and discard them?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty]);

  // Ctrl/Cmd+S saves.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doSave(isLive || isScheduled ? "update" : "draft", postRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSave, isLive, isScheduled]);

  const unpublish = () => confirm({
    title: isLive ? "Unpublish this post?" : "Cancel the schedule?",
    description: isLive ? "The post will be removed from the website and saved as a draft." : "The post will not be published automatically and will return to drafts.",
    confirmLabel: isLive ? "Unpublish" : "Move to draft",
    onConfirm: () => doSave("draft", postRef.current),
  });

  const saveLabel = saving === "autosave" ? "Autosaving…" : saving ? "Saving…" : dirty ? "Unsaved changes" : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Not saved yet";
  const minSchedule = toLocalInput(new Date(Date.now() + 5 * 60_000));
  const busy = !!saving && saving !== "autosave";
  const slugMessage = errors.slug ?? (post.slug ? validateSlug(post.slug) : null);

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 lg:-mt-8">
      {/* Sticky action bar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-white px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/admin/posts" className="flex items-center gap-1.5 rounded-md p-1.5 text-sm text-muted hover:bg-surface hover:text-navy-900" aria-label="Back to all posts">
          <ArrowLeft className="size-4" /><span className="hidden sm:inline">Posts</span>
        </Link>
        <span className="hidden h-5 w-px bg-border sm:block" />
        <PostStatusBadge status={post.status} />
        <span className={cn("flex items-center gap-1.5 text-xs", dirty && !saving ? "text-amber-700" : "text-muted")} aria-live="polite">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : dirty ? <span className="size-1.5 rounded-full bg-amber-500" /> : <Check className="size-3.5" />}
          {saveLabel}
        </span>
        <span className="hidden items-center gap-3 text-xs text-muted md:flex">
          <span className="flex items-center gap-1"><FileText className="size-3.5" />{words.toLocaleString()} words</span>
          <span className="flex items-center gap-1"><Clock className="size-3.5" />{minutes} min read</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}><Eye />Preview</Button>
          {(isLive || isScheduled) && perms.canPublish ? (
            <>
              <Button variant="outline" size="sm" onClick={unpublish} disabled={busy}><Undo2 />{isLive ? "Unpublish" : "Unschedule"}</Button>
              <Button size="sm" onClick={() => doSave("update", post)} loading={saving === "update"} disabled={busy}>
                <Check />{isLive ? "Update" : "Update schedule"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => doSave("draft", post)} loading={saving === "draft"} disabled={busy}>Save draft</Button>
              {perms.canPublish ? (
                scheduleMode
                  ? <Button size="sm" onClick={() => doSave("schedule", post)} loading={saving === "schedule"} disabled={busy}><CalendarClock />Schedule</Button>
                  : <Button size="sm" onClick={() => doSave("publish", post)} loading={saving === "publish"} disabled={busy}><Send />Publish</Button>
              ) : (
                <Button size="sm" onClick={() => doSave("pending", post)} loading={saving === "pending"} disabled={busy || post.status === "pending" && !dirty}>
                  <Send />{post.status === "pending" ? "Update submission" : "Submit for review"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="space-y-3 px-5 pt-5 sm:px-8 sm:pt-7">
              <label htmlFor="post-title" className="sr-only">Title</label>
              <textarea
                id="post-title"
                value={post.title}
                onChange={(e) => onTitle(e.target.value.replace(/\n/g, ""))}
                placeholder="Post title"
                rows={1}
                maxLength={200}
                className="w-full resize-none bg-transparent text-3xl font-semibold leading-tight tracking-tight text-navy-900 outline-none placeholder:text-slate-300 [field-sizing:content]"
                aria-invalid={!!errors.title}
                autoFocus={!initial.id}
              />
              {errors.title && <p className="text-xs text-red-600" role="alert">{errors.title}</p>}
              <div className="flex flex-wrap items-center gap-2 pb-4 text-sm">
                <span className="shrink-0 text-muted">{siteUrl.replace(/^https?:\/\//, "")}/blog/</span>
                <Input value={post.slug} aria-label="URL slug" aria-invalid={!!errors.slug}
                  onChange={(e) => { setSlugTouched(true); update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }); }}
                  onBlur={() => update({ slug: slugify(post.slug) || post.slug })}
                  className="h-8 max-w-xs flex-1 font-mono text-xs" />
                <Button variant="ghost" size="sm" onClick={() => { setSlugTouched(false); update({ slug: slugify(post.title) }); }} title="Regenerate slug from title">
                  <RefreshCw />Generate
                </Button>
                {slugMessage
                  ? <p className="w-full text-xs text-red-600" role="alert">{slugMessage}</p>
                  : isLive && slugTouched && post.slug !== initial.slug
                    ? <p className="w-full text-xs text-amber-700">Changing the URL of a published post breaks existing links to it.</p>
                    : null}
              </div>
            </div>
            <div className="border-t border-border">
              <RichTextEditor value={initial.content} onChange={onContent} canUpload={perms.canUpload} />
            </div>
            <div className="flex items-center gap-4 border-t border-border px-5 py-2.5 text-xs text-muted sm:px-8 md:hidden">
              <span>{words.toLocaleString()} words</span><span>{minutes} min read</span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Excerpt" description="A short summary shown in post listings and used as a fallback meta description." />
            <CardBody>
              <Textarea value={post.excerpt} onChange={(e) => update({ excerpt: e.target.value })} rows={3} maxLength={500} aria-label="Excerpt" placeholder="Summarize the post in a sentence or two…" />
              <p className="mt-1.5 text-right text-xs text-muted">{post.excerpt.length}/500</p>
            </CardBody>
          </Card>

          <SeoPanel
            seo={post.seo} onChange={(patch) => update({ seo: { ...post.seo, ...patch } })}
            title={post.title} slug={post.slug} content={post.content} excerpt={post.excerpt}
            featuredImage={post.featuredImage} siteUrl={siteUrl} titleSuffix={titleSuffix} errors={errors}
            onPickOgImage={() => setPicker("og")}
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-4 text-sm">
              <dl className="space-y-2">
                <div className="flex justify-between gap-2"><dt className="text-muted">Status</dt><dd><PostStatusBadge status={post.status} /></dd></div>
                {post.publishedAt && isLive && <div className="flex justify-between gap-2"><dt className="text-muted">Published</dt><dd>{formatDate(post.publishedAt, true)}</dd></div>}
                {post.updatedAt && <div className="flex justify-between gap-2"><dt className="text-muted">Last saved</dt><dd>{formatDate(post.updatedAt, true)}</dd></div>}
              </dl>
              {perms.canPublish && !isLive && (
                <fieldset className="space-y-2">
                  <legend className="mb-2 font-medium">When to publish</legend>
                  <label className="flex items-center gap-2"><input type="radio" name="when" checked={!scheduleMode} onChange={() => setScheduleMode(false)} disabled={isScheduled} className="accent-primary" />Immediately</label>
                  <label className="flex items-center gap-2"><input type="radio" name="when" checked={scheduleMode} onChange={() => { setScheduleMode(true); if (!post.scheduledAt) update({ scheduledAt: toLocalInput(new Date(Date.now() + 24 * 3600_000)) }); }} className="accent-primary" />Schedule for later</label>
                  {scheduleMode && (
                    <Field label="Publish on" htmlFor="schedule-at" error={errors.scheduledAt} hint={`Your timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}>
                      <Input id="schedule-at" type="datetime-local" value={post.scheduledAt} min={minSchedule} onChange={(e) => update({ scheduledAt: e.target.value })} aria-invalid={!!errors.scheduledAt} />
                    </Field>
                  )}
                </fieldset>
              )}
              {!perms.canPublish && (
                <p className="rounded-lg bg-surface p-3 text-xs text-muted">As a contributor, you can save drafts and submit them for review. An editor will publish approved posts.</p>
              )}
              {autosaveEligible && <p className="text-xs text-muted">Drafts are autosaved {AUTOSAVE_MS / 1000} seconds after you stop typing.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organization" />
            <CardBody className="space-y-4">
              <Field label="Category" htmlFor="post-category" error={errors.categoryId}>
                <Select id="post-category" value={post.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.depth ? "– " : ""}{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Tags" hint="Press Enter to add. New tags are created when you save.">
                <TagInput value={post.tags} onChange={(tags) => update({ tags })} options={tags} />
              </Field>
              {perms.canAssignAuthor && (
                <Field label="Author" htmlFor="post-author" error={errors.authorId}>
                  <Select id="post-author" value={post.authorId} onChange={(e) => update({ authorId: e.target.value })}>
                    {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </Field>
              )}
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium"><Star className="size-4 text-amber-500" />Featured post</span>
                <Switch checked={post.featured} onCheckedChange={(featured) => update({ featured })} label="Featured post" />
              </label>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Featured image" />
            <CardBody>
              {post.featuredImage ? (
                <div className="space-y-3">
                  <button type="button" onClick={() => setPicker("featured")} className="block w-full overflow-hidden rounded-lg border border-border" aria-label="Change featured image">
                    <img src={post.featuredImage.url} alt={post.featuredImage.alt ?? ""} className="aspect-video w-full object-cover" />
                  </button>
                  {!post.featuredImage.alt && <p className="text-xs text-amber-700">This image has no alt text. Add it in the Media Library.</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPicker("featured")}>Replace</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => update({ featuredImage: null })}><X />Remove</Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setPicker("featured")}
                  className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary">
                  <ImagePlus className="size-6" />Set featured image
                </button>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      <MediaPicker open={picker !== null} onOpenChange={(o) => !o && setPicker(null)} canUpload={perms.canUpload}
        title={picker === "og" ? "Choose social sharing image" : "Choose featured image"}
        onSelect={(m) => (picker === "og" ? update({ seo: { ...post.seo, ogImage: m } }) : update({ featuredImage: m }))} />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent title="Preview" description="How this post will look to readers (unsaved changes included)." size="xl">
          <article className="mx-auto max-w-3xl px-6 py-8">
            {post.featuredImage && <img src={post.featuredImage.url} alt={post.featuredImage.alt ?? ""} className="mb-8 aspect-[2/1] w-full rounded-xl object-cover" />}
            <p className="text-sm font-medium text-primary">{categories.find((c) => c.id === post.categoryId)?.name ?? "Uncategorized"}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-navy-900">{post.title || "Untitled post"}</h1>
            <p className="mt-3 text-sm text-muted">{minutes} min read · {words.toLocaleString()} words</p>
            {post.excerpt && <p className="mt-6 text-lg text-navy-700">{post.excerpt}</p>}
            <div className="post-body prose prose-slate mt-8 max-w-none prose-a:text-primary" dangerouslySetInnerHTML={{ __html: post.content }} />
          </article>
        </DialogContent>
      </Dialog>
    </div>
  );
}
