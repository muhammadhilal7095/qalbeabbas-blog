import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";

/** Serves files that are registered in the media library. Unknown names 404, so nothing else on disk is reachable. */
export async function GET(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const media = await db.media.findUnique({ where: { filename }, select: { mimeType: true, originalName: true } });
  if (!media) return new NextResponse("Not found", { status: 404 });
  const data = await readUpload(filename).catch(() => null);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": `inline; filename="${media.originalName.replace(/[^\w.\- ]/g, "_")}"`,
    },
  });
}
