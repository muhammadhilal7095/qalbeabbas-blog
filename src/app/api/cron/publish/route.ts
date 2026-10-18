import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { publishDuePosts } from "@/lib/scheduler";

export const runtime = "nodejs";

/**
 * Publishes scheduled posts whose time has come. Call every minute from a scheduler
 * (Vercel Cron, GitHub Actions, crontab) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret === "change-me" || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const published = await publishDuePosts();
  if (published) revalidatePath("/blog", "layout");
  return NextResponse.json({ published });
}
