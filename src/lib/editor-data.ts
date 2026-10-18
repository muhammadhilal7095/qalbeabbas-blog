import "server-only";
import { db } from "./db";
import { can } from "./permissions";
import { getSettings } from "./settings";
import { mediaUrl, siteUrl } from "./utils";
import type { SessionUser } from "./auth";
import type { EditorPost } from "@/components/editor/post-editor";
import type { Media } from "@prisma/client";

/** Flatten the category tree into display order with depth for indentation. */
export async function getCategoryOptions() {
  const all = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } });
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of all.filter((x) => x.parentId === parentId)) {
      out.push({ id: c.id, name: c.name, depth });
      if (depth < 10) walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function toMediaItem(m: Media | null) {
  if (!m) return null;
  return { id: m.id, url: mediaUrl(m.filename), filename: m.filename, originalName: m.originalName, mimeType: m.mimeType, size: m.size, alt: m.alt, caption: m.caption, createdAt: m.createdAt.toISOString() };
}

export async function getEditorContext(user: SessionUser) {
  const [categories, tags, authors, settings] = await Promise.all([
    getCategoryOptions(),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    can(user.role, "posts.edit_all") ? db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    getSettings(),
  ]);
  return {
    categories, tags, authors,
    perms: { canPublish: can(user.role, "posts.publish"), canAssignAuthor: can(user.role, "posts.edit_all"), canUpload: can(user.role, "media.upload") },
    siteUrl: siteUrl(),
    titleSuffix: settings.titleSuffix,
  };
}

export function emptyPost(authorId: string): EditorPost {
  return {
    id: null, title: "", slug: "", content: "", excerpt: "", status: "draft", featured: false, categoryId: "", tags: [], authorId,
    featuredImage: null, scheduledAt: "", publishedAt: null, updatedAt: null,
    seo: { metaTitle: "", metaDescription: "", focusKeyword: "", canonicalUrl: "", noIndex: false, noFollow: false, ogImage: null },
  };
}
