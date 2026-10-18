import type { MediaItem } from "@/actions/media";

/** Upload one file to the media library. Throws an Error with a user-facing message on failure. */
export async function uploadFile(file: File): Promise<MediaItem> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/media/upload", { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status}).`);
  return json.media as MediaItem;
}
