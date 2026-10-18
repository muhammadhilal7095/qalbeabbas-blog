import type { Prisma } from "@prisma/client";
import { requirePageUser } from "@/lib/auth";
import { ci, db } from "@/lib/db";
import { param } from "@/lib/utils";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { TagManager } from "@/components/admin/taxonomy/tag-manager";

export const metadata = { title: "Tags" };
const PAGE_SIZE = 25;

export default async function TagsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser("taxonomy.manage");
  const sp = await searchParams;
  const q = param(sp, "q")?.trim() || undefined;
  const sort = param(sp, "sort") === "posts" ? "posts" : param(sp, "sort") === "newest" ? "newest" : "name";
  const where: Prisma.TagWhereInput = q ? { OR: [{ name: ci(q) }, { slug: ci(q.toLowerCase()) }] } : {};
  const total = await db.tag.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(param(sp, "page")) || 1));
  const [tags, totalAll] = await Promise.all([
    db.tag.findMany({
      where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      orderBy: sort === "posts" ? [{ posts: { _count: "desc" } }, { name: "asc" }] : sort === "newest" ? { createdAt: "desc" } : { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    db.tag.count(),
  ]);
  return (
    <>
      <PageHeader title="Tags" description="Tags describe specific topics. Posts can have many tags." />
      <Card>
        <TagManager tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, posts: t._count.posts }))} q={q} sort={sort} isEmpty={totalAll === 0} />
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/admin/tags" params={{ q, sort: sort === "name" ? undefined : sort }} />
      </Card>
    </>
  );
}
