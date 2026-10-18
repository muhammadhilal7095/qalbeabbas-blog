import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { CategoryManager } from "@/components/admin/taxonomy/category-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePageUser("taxonomy.manage");
  const rows = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
  // Build display order (parents followed by children) with depth.
  const ordered: { id: string; name: string; slug: string; description: string | null; parentId: string | null; depth: number; posts: number; updatedAt: string }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of rows.filter((r) => r.parentId === parentId)) {
      ordered.push({ id: c.id, name: c.name, slug: c.slug, description: c.description, parentId: c.parentId, depth, posts: c._count.posts, updatedAt: c.updatedAt.toISOString() });
      if (depth < 10) walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  const uncategorized = await db.post.count({ where: { categoryId: null } });
  return (
    <>
      <PageHeader title="Categories" description="Organize posts into a hierarchy. Each post belongs to one category." />
      <CategoryManager categories={ordered} uncategorized={uncategorized} />
    </>
  );
}
