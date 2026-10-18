import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  if (settings.searchIndexing !== "true") return [];
  const posts = await db.post.findMany({
    where: { status: "published", noIndex: false, canonicalUrl: null },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });
  return [
    { url: `${siteUrl()}/blog`, changeFrequency: "daily", priority: 1 },
    ...posts.map((p) => ({ url: `${siteUrl()}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
