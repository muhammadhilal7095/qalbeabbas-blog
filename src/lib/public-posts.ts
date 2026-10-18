import "server-only";
import { db } from "./db";

export const publicPostInclude = {
  author: { select: { name: true, bio: true } },
  category: { select: { name: true, slug: true } },
  tags: { select: { name: true, slug: true } },
  featuredImage: true,
  ogImage: true,
} as const;

export async function getPublishedPost(slug: string) {
  return db.post.findFirst({ where: { slug, status: "published" }, include: publicPostInclude });
}
