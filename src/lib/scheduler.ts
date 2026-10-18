import "server-only";
import { db } from "./db";

/**
 * Promote scheduled posts whose time has come. Called on admin and public page loads
 * (cheap indexed update) and by the /api/cron/publish endpoint for timely publishing.
 */
export async function publishDuePosts() {
  const now = new Date();
  const due = await db.post.findMany({
    where: { status: "scheduled", scheduledAt: { lte: now } },
    select: { id: true, scheduledAt: true },
  });
  for (const p of due) {
    await db.post.update({ where: { id: p.id }, data: { status: "published", publishedAt: p.scheduledAt ?? now } });
  }
  return due.length;
}
