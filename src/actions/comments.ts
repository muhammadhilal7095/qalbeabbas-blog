"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { run, UserError } from "@/lib/action";
import { COMMENT_STATUSES } from "@/lib/validation";

const schema = z.object({
  ids: z.array(z.string()).min(1, "Select at least one comment.").max(500),
  action: z.enum([...COMMENT_STATUSES, "delete"]),
});

const VERB: Record<string, string> = { approved: "approved", pending: "moved to pending", spam: "marked as spam", rejected: "rejected", delete: "deleted" };

export async function moderateComments(ids: string[], action: z.infer<typeof schema>["action"]) {
  return run(async () => {
    await requireUser("comments.moderate");
    const data = schema.parse({ ids, action });
    const affected = await db.comment.findMany({ where: { id: { in: data.ids } }, select: { post: { select: { slug: true } } } });
    if (!affected.length) throw new UserError("Those comments no longer exist.");
    const { count } = data.action === "delete"
      ? await db.comment.deleteMany({ where: { id: { in: data.ids } } })
      : await db.comment.updateMany({ where: { id: { in: data.ids } }, data: { status: data.action } });
    revalidatePath("/admin", "layout");
    for (const slug of new Set(affected.map((a) => a.post.slug))) revalidatePath(`/blog/${slug}`);
    return { message: `${count} comment${count === 1 ? "" : "s"} ${VERB[data.action]}.` };
  });
}
