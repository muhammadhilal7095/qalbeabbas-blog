import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { AuthError, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, sniffMime, storeFile } from "@/lib/storage";
import { mediaUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Same-origin check (defence in depth on top of the SameSite session cookie).
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "Cross-origin upload rejected." }, { status: 403 });
  }
  let user;
  try {
    user = await requireUser("media.upload");
  } catch (e) {
    return NextResponse.json({ error: e instanceof AuthError ? e.message : "Unauthorized" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `File is too large. Maximum size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !ALLOWED_TYPES[mime]) {
    return NextResponse.json({ error: "Unsupported file type. Upload JPG, PNG, GIF, WebP, AVIF, MP4, WebM or PDF files." }, { status: 415 });
  }

  const filename = await storeFile(buf, mime);
  const alt = String(form?.get("alt") ?? "").slice(0, 300) || null;
  const media = await db.media.create({
    data: { filename, originalName: file.name.slice(0, 200) || filename, mimeType: mime, size: file.size, alt, uploadedById: user.id },
  });
  revalidatePath("/admin/media");
  return NextResponse.json({
    media: { id: media.id, url: mediaUrl(filename), filename, originalName: media.originalName, mimeType: mime, size: media.size, alt: media.alt, caption: null, createdAt: media.createdAt.toISOString() },
  });
}
