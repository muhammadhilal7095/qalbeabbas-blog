import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PlusCircle } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { ci, db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { POST_STATUSES } from "@/lib/validation";
import { mediaUrl, param } from "@/lib/utils";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PostFilters } from "@/components/admin/posts/post-filters";
import { PostsTable, type PostRow } from "@/components/admin/posts/posts-table";
import { canDeletePost, canEditPost } from "@/lib/permissions";

export const metadata = { title: "All Blog Posts" };
const PAGE_SIZES = [10, 20, 50];

export default async function PostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const f = {
    q: param(sp, "q")?.trim() || undefined,
    status: param(sp, "status") || undefined,
    category: param(sp, "category") || undefined,
    author: param(sp, "author") || undefined,
    from: param(sp, "from") || undefined,
    to: param(sp, "to") || undefined,
    sort: param(sp, "sort") || "newest",
    size: param(sp, "size") || undefined,
  };
  const pageSize = PAGE_SIZES.includes(Number(f.size)) ? Number(f.size) : 10;
  const canSeeAll = can(user.role, "posts.edit_all");

  const where: Prisma.PostWhereInput = {};
  if (!canSeeAll) where.authorId = user.id;
  else if (f.author) where.authorId = f.author;
  if (f.status && (POST_STATUSES as readonly string[]).includes(f.status)) where.status = f.status;
  else where.status = { not: "archived" };
  if (f.category === "none") where.categoryId = null;
  else if (f.category) where.categoryId = f.category;
  if (f.q) where.OR = [{ title: ci(f.q) }, { excerpt: ci(f.q) }, { content: ci(f.q) }, { focusKeyword: ci(f.q) }, { slug: ci(f.q.toLowerCase()) }];
  const from = f.from ? new Date(`${f.from}T00:00:00`) : null;
  const to = f.to ? new Date(`${f.to}T23:59:59.999`) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    where.createdAt = { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}) };
  }

  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    f.sort === "oldest" ? [{ createdAt: "asc" }]
    : f.sort === "views" ? [{ views: { _count: "desc" } }, { createdAt: "desc" }]
    : f.sort === "comments" ? [{ comments: { _count: "desc" } }, { createdAt: "desc" }]
    : f.sort === "title" ? [{ title: "asc" }]
    : f.sort === "seo" ? [{ seoScore: "desc" }]
    : [{ createdAt: "desc" }];

  const total = await db.post.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number(param(sp, "page")) || 1));

  const scopeWhere: Prisma.PostWhereInput = canSeeAll ? {} : { authorId: user.id };
  const [posts, categories, authors, statusCounts] = await Promise.all([
    db.post.findMany({
      where, orderBy, skip: (page - 1) * pageSize, take: pageSize,
      select: {
        id: true, title: true, slug: true, status: true, featured: true, createdAt: true, publishedAt: true, scheduledAt: true, seoScore: true, authorId: true,
        author: { select: { name: true } }, category: { select: { name: true } },
        featuredImage: { select: { filename: true, alt: true } },
        _count: { select: { views: true, comments: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    canSeeAll ? db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    db.post.groupBy({ by: ["status"], where: scopeWhere, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
  const totalAll = await db.post.count({ where: scopeWhere });

  const rows: PostRow[] = posts.map((p) => ({
    id: p.id, title: p.title, slug: p.slug, status: p.status, featured: p.featured,
    author: p.author.name, category: p.category?.name ?? null,
    date: (p.status === "scheduled" ? p.scheduledAt : p.publishedAt ?? p.createdAt)?.toISOString() ?? null,
    dateLabel: p.status === "scheduled" ? "Scheduled" : p.publishedAt ? "Published" : "Created",
    views: p._count.views, comments: p._count.comments, seoScore: p.seoScore,
    thumb: p.featuredImage ? mediaUrl(p.featuredImage.filename) : null, thumbAlt: p.featuredImage?.alt ?? "",
    canEdit: canEditPost(user, p), canDelete: canDeletePost(user, p),
  }));
  const hasFilters = !!(f.q || f.status || f.category || f.author || f.from || f.to);

  return (
    <>
      <PageHeader title="All Blog Posts" description={canSeeAll ? "Manage every post on your blog." : "Manage the posts you've written."}
        actions={can(user.role, "posts.create") && <Link href="/admin/posts/new" className={buttonClasses()}><PlusCircle />Create new post</Link>} />
      <Card>
        <PostFilters
          filters={f}
          counts={{ all: totalAll - (counts.archived ?? 0), ...counts }}
          categories={categories}
          authors={authors}
        />
        <PostsTable
          rows={rows}
          hasFilters={hasFilters}
          isEmpty={totalAll === 0}
          canPublish={can(user.role, "posts.publish")}
          canCreate={can(user.role, "posts.create")}
          viewingArchived={f.status === "archived"}
        />
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} basePath="/admin/posts" params={f} />
      </Card>
    </>
  );
}
