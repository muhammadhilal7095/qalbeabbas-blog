"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { commentSubmitSchema } from "@/lib/validation";
import { sanitizeText } from "@/lib/sanitize";

export type CommentState = { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function submitComment(_: CommentState, formData: FormData): Promise<CommentState> {
  const parsed = commentSubmitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const settings = await getSettings();
  if (settings.commentsEnabled !== "true") return { error: "Comments are closed." };
  const post = await db.post.findFirst({ where: { id: parsed.data.postId, status: "published" }, select: { id: true, slug: true } });
  if (!post) return { error: "This post is no longer available." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const ipHash = createHash("sha256").update(`${process.env.ANALYTICS_SALT ?? ""}:${ip}`).digest("hex").slice(0, 32);
  const recent = await db.comment.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 5) return { error: "You're commenting too quickly. Please wait a few minutes." };

  const content = sanitizeText(parsed.data.content);
  const linkCount = (content.match(/https?:\/\//g) ?? []).length;
  // Honeypot filled or link-stuffed comments go straight to spam for review.
  const status = parsed.data.website2 || linkCount > 3 ? "spam" : settings.commentsRequireApproval === "true" ? "pending" : "approved";

  await db.comment.create({
    data: {
      postId: post.id, authorName: sanitizeText(parsed.data.authorName), authorEmail: parsed.data.authorEmail.toLowerCase(),
      authorUrl: parsed.data.authorUrl, content, status, ipHash, userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
    },
  });
  if (status === "approved") revalidatePath(`/blog/${post.slug}`);
  return { ok: true, message: status === "approved" ? "Thanks! Your comment is live." : "Thanks! Your comment will appear once it's approved." };
}
