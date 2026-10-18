import "server-only";
import path from "node:path";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

/** Detect the real file type from magic bytes; never trust the client-sent MIME type. */
export function sniffMime(buf: Buffer): string | null {
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("474946383")) return "image/gif";
  if (hex.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(4, 8).toString() === "ftyp") {
    const brand = buf.subarray(8, 12).toString();
    if (brand.startsWith("avi")) return "image/avif";
    return "video/mp4";
  }
  if (hex.startsWith("1a45dfa3")) return "video/webm";
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

export async function storeFile(buf: Buffer, mime: string) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${ALLOWED_TYPES[mime]}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buf, { flag: "wx" });
  return filename;
}

/** Resolve a stored filename safely (rejects traversal). */
export function resolveUpload(filename: string) {
  if (!/^[a-z0-9]+-[a-f0-9]{16}\.[a-z0-9]+$/.test(filename)) return null;
  return path.join(UPLOAD_DIR, filename);
}

export async function readUpload(filename: string) {
  const p = resolveUpload(filename);
  return p ? readFile(p) : null;
}

export async function deleteUpload(filename: string) {
  const p = resolveUpload(filename);
  if (p) await unlink(p).catch(() => undefined);
}
