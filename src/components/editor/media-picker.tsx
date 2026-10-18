"use client";
import * as React from "react";
import { toast } from "sonner";
import { Check, ImageIcon, Loader2, Search, Upload } from "lucide-react";
import { listMedia, type MediaItem } from "@/actions/media";
import { uploadFile } from "@/components/admin/upload";
import { cn, formatBytes } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";

export function MediaPicker({ open, onOpenChange, onSelect, canUpload, title = "Choose an image", type = "image" }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSelect: (m: MediaItem) => void; canUpload: boolean; title?: string; type?: "image" | "video" | "";
}) {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [selected, setSelected] = React.useState<MediaItem | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageCount, setPageCount] = React.useState(1);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async (p: number, query: string) => {
    setLoading(true);
    try {
      const res = await listMedia({ q: query || undefined, type: type || undefined, page: p, pageSize: 24 });
      setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
      setPageCount(res.pageCount);
      setPage(p);
    } catch {
      toast.error("Couldn't load the media library.");
    } finally {
      setLoading(false);
    }
  }, [type]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(1, q), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [open, q, load]);
  React.useEffect(() => { if (!open) { setSelected(null); setQ(""); } }, [open]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let last: MediaItem | null = null;
    for (const f of Array.from(files)) {
      try { last = await uploadFile(f); setItems((prev) => [last!, ...prev]); }
      catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    setUploading(false);
    if (last) { setSelected(last); toast.success("Upload complete."); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} size="xl">
        <div
          className={cn("p-5", dragOver && "bg-primary-soft")}
          onDragOver={(e) => { if (canUpload) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (canUpload) void handleFiles(e.dataTransfer.files); }}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, alt text or caption…" className="pl-9" aria-label="Search media" />
            </div>
            {canUpload && (
              <>
                <input ref={inputRef} type="file" multiple hidden accept={type === "video" ? "video/mp4,video/webm" : type === "image" ? "image/*" : undefined} onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />
                <Button variant="outline" onClick={() => inputRef.current?.click()} loading={uploading}><Upload />Upload</Button>
              </>
            )}
          </div>
          {canUpload && <p className="mb-3 text-xs text-muted">Tip: drag and drop files anywhere in this window to upload.</p>}
          {items.length === 0 && !loading ? (
            <EmptyState icon={ImageIcon} title={q ? "No matching files" : "Your media library is empty"} description={canUpload ? "Upload an image to get started." : "Ask an editor to upload images."} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((m) => (
                <button key={m.id} type="button" onClick={() => setSelected(m)} onDoubleClick={() => { onSelect(m); onOpenChange(false); }}
                  className={cn("group relative aspect-square overflow-hidden rounded-lg border-2 bg-surface text-left", selected?.id === m.id ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-slate-300")}
                  aria-pressed={selected?.id === m.id} aria-label={m.alt || m.originalName}>
                  {m.mimeType.startsWith("image/") ? <img src={m.url} alt="" className="size-full object-cover" loading="lazy" />
                    : <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{m.originalName}</div>}
                  {selected?.id === m.id && <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white"><Check className="size-3" /></span>}
                </button>
              ))}
            </div>
          )}
          {loading && <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted" /></div>}
          {!loading && page < pageCount && <div className="mt-4 flex justify-center"><Button variant="outline" size="sm" onClick={() => load(page + 1, q)}>Load more</Button></div>}
        </div>
        <DialogFooter className="justify-between">
          <p className="min-w-0 truncate text-xs text-muted">{selected ? `${selected.originalName} · ${formatBytes(selected.size)}${selected.alt ? "" : " · no alt text"}` : "Select a file"}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!selected} onClick={() => { if (selected) { onSelect(selected); onOpenChange(false); } }}>Use selected</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
