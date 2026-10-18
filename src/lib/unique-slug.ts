import "server-only";
import { db } from "./db";

type Model = "post" | "category" | "tag";

async function exists(model: Model, slug: string, excludeId?: string | null) {
  const where = { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) };
  if (model === "post") return !!(await db.post.findFirst({ where, select: { id: true } }));
  if (model === "category") return !!(await db.category.findFirst({ where, select: { id: true } }));
  return !!(await db.tag.findFirst({ where, select: { id: true } }));
}

export async function slugTaken(model: Model, slug: string, excludeId?: string | null) {
  return exists(model, slug, excludeId);
}

/** Return `base`, or `base-2`, `base-3`… whichever is free. */
export async function uniqueSlug(model: Model, base: string, excludeId?: string | null) {
  const root = base || "untitled";
  if (!(await exists(model, root, excludeId))) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root.slice(0, 110)}-${i}`;
    if (!(await exists(model, candidate, excludeId))) return candidate;
  }
  return `${root.slice(0, 100)}-${Date.now().toString(36)}`;
}
