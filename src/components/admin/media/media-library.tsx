"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, FileText, Film, Grid2X2, ImageIcon, List, Loader2, SearchX, Trash2, Upload } from "lucide-react";
import { deleteMedia, getMediaUsage, updateMedia, type MediaItem, type MediaUsage } from "@/actions/media";
import { uploadFile } from "@/components/admin/upload";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SearchInput, useUrlParams } from "@/components/admin/posts/post-filters";

function FileIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime.startsWith("video/")) return <Film className={className} />;
  if (mime === "application/pdf") return <FileText className={className} />;
  return <ImageIcon className={className} />;
}

function Thumb({ m, className }: { m: MediaItem; className?: string }) {
  return m.mimeType.startsWith("image/")
    ? <img src={m.url} alt={m.alt ?? ""} className={cn("object-cover", className)} loading="lazy" />
    : <div className={cn("flex items-center justify-center bg-surface text-muted", className)}><FileIcon mime={m.mimeType} className="size-8" /></div>;
}

export function MediaLibrary({ items, q, type, view, isEmpty, currentUserId, canManageAll }: {
  items: MediaItem[]; q?: string; type?: string; view: "grid" | "list"; isEmpty: boolean; currentUserId: string; canManageAll: boolean;
}) {
  const router = useRouter();
  const { set, pending } = useUrlParams();
  const [uploads, setUploads] = React.useState<{ name: string; status: "uploading" | "done" | "error"; error?: string }[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [open, setOpen] = React.useState<MediaItem | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploads(list.map((f) => ({ name: f.name, status: "uploading" })));
    let ok = 0;
    await Promise.all(list.map(async (f, i) => {
      try {
        await uploadFile(f); ok++;
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, status: "done" } : x)));
      } catch (e) {
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, status: "error", error: (e as Error).message } : x)));
      }
    }));
    if (ok) { toast.success(`${ok} file${ok === 1 ? "" : "s"} uploaded.`); router.refresh(); }
    setTimeout(() => setUploads((u) => u.filter((x) => x.status === "error")), 2500);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
      className="relative"
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary-soft/90">
          <p className="flex items-center gap-2 font-medium text-primary"><Upload className="size-5" />Drop files to upload</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <SearchInput value={q} onSearch={(v) => set({ q: v || undefined })} placeholder="Search files, alt text, captions…" pending={pending} />
        <Select value={type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })} className="w-auto" aria-label="File type">
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="View">
            <button onClick={() => set({ view: undefined })} aria-pressed={view === "grid"} aria-label="Grid view" className={cn("rounded-md p-1.5", view === "grid" ? "bg-primary text-white" : "text-muted hover:bg-surface")}><Grid2X2 className="size-4" /></button>
            <button onClick={() => set({ view: "list" })} aria-pressed={view === "list"} aria-label="List view" className={cn("rounded-md p-1.5", view === "list" ? "bg-primary text-white" : "text-muted hover:bg-surface")}><List className="size-4" /></button>
          </div>
          <input ref={inputRef} type="file" multiple hidden accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,application/pdf"
            onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); e.target.value = ""; }} />
          <Button onClick={() => inputRef.current?.click()}><Upload />Upload files</Button>
        </div>
      </div>

      {uploads.length > 0 && (
        <ul className="space-y-1 border-b border-border bg-surface/50 px-4 py-3 text-sm" aria-live="polite">
          {uploads.map((u, i) => (
            <li key={i} className="flex items-center gap-2">
              {u.status === "uploading" ? <Loader2 className="size-4 animate-spin text-primary" /> : u.status === "done" ? <span className="text-emerald-600">✓</span> : <span className="text-red-600">✕</span>}
              <span className="truncate">{u.name}</span>
              {u.error && <span className="text-xs text-red-600">{u.error}</span>}
              {u.status === "error" && <button className="ml-auto text-xs text-muted hover:text-navy-900" onClick={() => setUploads((x) => x.filter((_, j) => j !== i))}>Dismiss</button>}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        isEmpty ? (
          <button onClick={() => inputRef.current?.click()} className="m-5 flex w-[calc(100%-2.5rem)] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center hover:border-primary hover:bg-primary-soft/40">
            <Upload className="size-8 text-primary" />
            <p className="mt-3 font-medium">Drag and drop files here, or click to browse</p>
            <p className="mt-1 text-sm text-muted">JPG, PNG, GIF, WebP, AVIF, MP4, WebM or PDF</p>
          </button>
        ) : <EmptyState icon={SearchX} title="No files match" description="Try a different search or file type." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <button key={m.id} onClick={() => setOpen(m)} className="group overflow-hidden rounded-lg border border-border bg-white text-left shadow-card transition-shadow hover:shadow-pop focus-visible:ring-2 focus-visible:ring-primary">
              <Thumb m={m} className="aspect-square w-full" />
              <div className="border-t border-border px-2.5 py-2">
                <p className="truncate text-xs font-medium">{m.originalName}</p>
                <p className="text-[11px] text-muted">{formatBytes(m.size)}{!m.alt && m.mimeType.startsWith("image/") ? " · no alt" : ""}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">File</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Size</th><th className="px-3 py-3">Alt text</th><th className="px-3 py-3">Uploaded</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {items.map((m) => (
                <tr key={m.id} className="cursor-pointer hover:bg-surface/60" onClick={() => setOpen(m)}>
                  <td className="px-4 py-2.5">
                    <button className="flex items-center gap-3 text-left" onClick={() => setOpen(m)}>
                      <Thumb m={m} className="size-10 shrink-0 rounded-md" />
                      <span className="max-w-xs truncate font-medium">{m.originalName}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{m.mimeType}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatBytes(m.size)}</td>
                  <td className="max-w-xs truncate px-3 py-2.5">{m.alt || <span className="text-amber-700">Missing</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{formatDate(m.createdAt)}{m.uploadedBy ? ` · ${m.uploadedBy}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <MediaDetails key={open?.id} media={open} onClose={() => setOpen(null)} canManageAll={canManageAll}
        readOnly={!canManageAll && open?.uploadedById !== currentUserId} onChanged={() => router.refresh()} />
    </div>
  );
}

function MediaDetails({ media, onClose, canManageAll, readOnly, onChanged }: {
  media: MediaItem | null; onClose: () => void; canManageAll: boolean; readOnly: boolean; onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [alt, setAlt] = React.useState(media?.alt ?? "");
  const [caption, setCaption] = React.useState(media?.caption ?? "");
  const [saving, setSaving] = React.useState(false);
  const [usage, setUsage] = React.useState<MediaUsage | null>(null);
  React.useEffect(() => { if (media) getMediaUsage(media.id).then(setUsage).catch(() => setUsage([])); }, [media]);
  if (!media) return null;
  const absoluteUrl = typeof window !== "undefined" ? `${window.location.origin}${media.url}` : media.url;

  const save = async () => {
    setSaving(true);
    const res = await updateMedia({ id: media.id, alt, caption });
    setSaving(false);
    if (res.ok) { toast.success(res.message); onChanged(); } else toast.error(res.error);
  };
  const remove = () => confirm({
    title: "Delete this file?",
    description: usage && usage.length
      ? <>This file is used in <strong>{usage.length} post{usage.length === 1 ? "" : "s"}</strong>. Deleting it will remove it as a featured/social image and leave broken images where it's embedded in content.{!canManageAll && " Only editors can delete files that are in use."}</>
      : "This file isn't used in any posts. It will be permanently removed.",
    confirmLabel: usage?.length ? "Delete anyway" : "Delete", destructive: true,
    onConfirm: async () => {
      const res = await deleteMedia(media.id, !!usage?.length);
      if (res.ok) { toast.success(res.message); onClose(); onChanged(); } else toast.error(res.error);
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="File details" size="lg">
        <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_1fr]">
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
            {media.mimeType.startsWith("image/") ? <img src={media.url} alt={media.alt ?? ""} className="max-h-[60vh] w-full object-contain" />
              : media.mimeType.startsWith("video/") ? <video src={media.url} controls className="max-h-[60vh] w-full" />
              : <a href={media.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-8 text-primary"><FileText className="size-10" />Open PDF</a>}
          </div>
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">File name</dt><dd className="truncate" title={media.originalName}>{media.originalName}</dd>
              <dt className="text-muted">Type</dt><dd>{media.mimeType}</dd>
              <dt className="text-muted">Size</dt><dd>{formatBytes(media.size)}</dd>
              <dt className="text-muted">Uploaded</dt><dd>{formatDate(media.createdAt, true)}{media.uploadedBy ? ` by ${media.uploadedBy}` : ""}</dd>
            </dl>
            <div className="flex gap-2">
              <Input readOnly value={absoluteUrl} aria-label="File URL" className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(absoluteUrl).then(() => toast.success("URL copied."), () => toast.error("Couldn't copy. Select the URL and copy it manually."))}><Copy />Copy</Button>
            </div>
            <Field label="Alt text" htmlFor="m-alt" hint="Describe the image for screen readers and search engines.">
              <Input id="m-alt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} disabled={readOnly} />
            </Field>
            <Field label="Caption" htmlFor="m-caption">
              <Textarea id="m-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={500} disabled={readOnly} />
            </Field>
            {readOnly && <p className="text-xs text-muted">You can only edit or delete files you uploaded.</p>}
            <div className="text-sm">
              <p className="font-medium">Used in</p>
              {usage === null ? <p className="text-muted">Checking…</p> : usage.length === 0 ? <p className="text-muted">Not used in any posts.</p> : (
                <ul className="mt-1 space-y-1">
                  {usage.map((u) => <li key={u.id}><a href={`/admin/posts/${u.id}/edit`} className="text-primary hover:underline">{u.title}</a> <span className="text-xs text-muted">({u.how})</span></li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="justify-between">
          {readOnly ? <span /> : <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={remove}><Trash2 />Delete file</Button>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {!readOnly && <Button onClick={save} loading={saving}>Save details</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
