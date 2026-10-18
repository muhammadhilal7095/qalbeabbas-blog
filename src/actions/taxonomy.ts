"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { run, UserError } from "@/lib/action";
import { categorySchema, tagSchema } from "@/lib/validation";
import { slugTaken } from "@/lib/unique-slug";

function revalidateTaxonomy() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/tags");
  revalidatePath("/admin/posts");
  revalidatePath("/blog", "layout");
}

/** True if `candidateParent` is `id` itself or one of its descendants (would create a cycle). */
async function createsCycle(id: string, candidateParent: string) {
  let cur: string | null = candidateParent;
  for (let i = 0; cur && i < 50; i++) {
    if (cur === id) return true;
    const row: { parentId: string | null } | null = await db.category.findUnique({ where: { id: cur }, select: { parentId: true } });
    cur = row?.parentId ?? null;
  }
  return false;
}

export async function saveCategory(input: z.input<typeof categorySchema>) {
  return run(async () => {
    await requireUser("taxonomy.manage");
    const data = categorySchema.parse(input);
    if (await slugTaken("category", data.slug, data.id)) throw new UserError("Slug already in use.", { slug: "Another category already uses this slug." });
    if (data.parentId) {
      if (!(await db.category.findUnique({ where: { id: data.parentId } }))) throw new UserError("Parent category not found.", { parentId: "Choose another parent." });
      if (data.id && (await createsCycle(data.id, data.parentId))) throw new UserError("A category can't be nested inside itself or its own subcategory.", { parentId: "Invalid parent." });
    }
    const { id, ...fields } = data;
    if (id) await db.category.update({ where: { id }, data: fields });
    else await db.category.create({ data: fields });
    revalidateTaxonomy();
    return { message: id ? "Category updated." : "Category created." };
  });
}

/**
 * Delete a category without orphaning data: its posts move to `reassignTo` (or become
 * uncategorized) and its subcategories move up to its parent.
 */
export async function deleteCategory(id: string, reassignTo: string | null) {
  return run(async () => {
    await requireUser("taxonomy.manage");
    const cat = await db.category.findUnique({ where: { id }, include: { _count: { select: { posts: true, children: true } } } });
    if (!cat) throw new UserError("Category not found.");
    if (reassignTo) {
      if (reassignTo === id) throw new UserError("Choose a different category to move posts to.");
      if (!(await db.category.findUnique({ where: { id: reassignTo } }))) throw new UserError("The target category no longer exists.");
    }
    await db.$transaction([
      db.post.updateMany({ where: { categoryId: id }, data: { categoryId: reassignTo } }),
      db.category.updateMany({ where: { parentId: id }, data: { parentId: cat.parentId } }),
      db.category.delete({ where: { id } }),
    ]);
    revalidateTaxonomy();
    const moved = cat._count.posts ? ` ${cat._count.posts} post(s) ${reassignTo ? "moved" : "set to Uncategorized"}.` : "";
    return { message: `Category “${cat.name}” deleted.${moved}` };
  });
}

export async function saveTag(input: z.input<typeof tagSchema>) {
  return run(async () => {
    await requireUser("taxonomy.manage");
    const data = tagSchema.parse(input);
    if (await slugTaken("tag", data.slug, data.id)) throw new UserError("Slug already in use.", { slug: "Another tag already uses this slug." });
    const { id, ...fields } = data;
    if (id) await db.tag.update({ where: { id }, data: fields });
    else await db.tag.create({ data: fields });
    revalidateTaxonomy();
    return { message: id ? "Tag updated." : "Tag created." };
  });
}

/** Deleting tags only detaches them from posts; posts themselves are untouched. */
export async function deleteTags(ids: string[]) {
  return run(async () => {
    await requireUser("taxonomy.manage");
    if (!ids.length) throw new UserError("Select at least one tag.");
    const { count } = await db.tag.deleteMany({ where: { id: { in: ids } } });
    revalidateTaxonomy();
    return { message: `${count} tag${count === 1 ? "" : "s"} deleted.` };
  });
}

/** Merge `sourceIds` into `targetId`: posts keep their tagging, duplicates collapse. */
export async function mergeTags(sourceIds: string[], targetId: string) {
  return run(async () => {
    await requireUser("taxonomy.manage");
    const sources = sourceIds.filter((s) => s !== targetId);
    if (!sources.length) throw new UserError("Select at least one other tag to merge.");
    const target = await db.tag.findUnique({ where: { id: targetId } });
    if (!target) throw new UserError("Target tag not found.");
    const posts = await db.post.findMany({ where: { tags: { some: { id: { in: sources } } } }, select: { id: true } });
    await db.$transaction([
      ...posts.map((p) => db.post.update({ where: { id: p.id }, data: { tags: { connect: { id: targetId } } } })),
      db.tag.deleteMany({ where: { id: { in: sources } } }),
    ]);
    revalidateTaxonomy();
    return { message: `Merged ${sources.length} tag(s) into “${target.name}”.` };
  });
}
