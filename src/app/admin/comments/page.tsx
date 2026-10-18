import type { Prisma } from "@prisma/client";
import { requirePageUser } from "@/lib/auth";
import { ci, db } from "@/lib/db";
import { COMMENT_STATUSES } from "@/lib/validation";
import { param } from "@/lib/utils";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { CommentsManager } from "@/components/admin/comments/comments-manager";

export const metadata = { title: "Comments" };
const PAGE_SIZE = 20;

export default async function CommentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser("comments.moderate");
  const sp = await searchParams;
  const status = param(sp, "status");
  const q = param(sp, "q")?.trim() || undefined;
  const post = param(sp, "post") || undefined;
  const sort = param(sp, "sort") === "oldest" ? "oldest" : "newest";

  const where: Prisma.CommentWhereInput = {};
  if (status && (COMMENT_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (post) where.postId = post;
  if (q) where.OR = [{ authorName: ci(q) }, { authorEmail: ci(q) }, { content: ci(q) }];

  const total = await db.comment.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(param(sp, "page")) || 1));
  const [comments, grouped, posts] = await Promise.all([
    db.comment.findMany({
      where, orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { post: { select: { id: true, title: true, slug: true, status: true } } },
    }),
    db.comment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.post.findMany({ where: { comments: { some: {} } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const counts: Record<string, number> = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  counts.all = grouped.reduce((s, g) => s + g._count._all, 0);

  return (
    <>
      <PageHeader title="Comments" description="Review, approve and moderate reader comments." />
      <Card>
        <CommentsManager
          comments={comments.map((c) => ({
            id: c.id, authorName: c.authorName, authorEmail: c.authorEmail, authorUrl: c.authorUrl, content: c.content, status: c.status,
            createdAt: c.createdAt.toISOString(), post: c.post,
          }))}
          counts={counts} posts={posts} filters={{ status, q, post, sort }} hasFilters={!!(q || post)}
        />
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/admin/comments" params={{ status, q, post, sort: sort === "newest" ? undefined : sort }} />
      </Card>
    </>
  );
}
