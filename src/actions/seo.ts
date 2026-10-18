"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { run, UserError } from "@/lib/action";
import { canEditPost } from "@/lib/permissions";
import { analyzeSeo } from "@/lib/seo";
import { saveSettings } from "@/lib/settings";
import { SLUG_PATTERN } from "@/lib/slug";
import { slugTaken } from "@/lib/unique-slug";

const postSeoSchema = z.object({
  id: z.string(),
  slug: z.string().trim().min(1, "Slug is required.").max(120).regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only."),
  metaTitle: z.string().trim().max(120, "Meta title must be 120 characters or fewer."),
  metaDescription: z.string().trim().max(320, "Meta description must be 320 characters or fewer."),
  focusKeyword: z.string().trim().max(100),
  canonicalUrl: z.string().trim().max(500).refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Canonical URL must start with http:// or https://"),
  noIndex: z.boolean(),
  noFollow: z.boolean(),
});

export async function updatePostSeo(input: z.input<typeof postSeoSchema>) {
  return run(async () => {
    const user = await requireUser("seo.manage");
    const data = postSeoSchema.parse(input);
    const post = await db.post.findUnique({ where: { id: data.id } });
    if (!post) throw new UserError("Post not found.");
    if (!canEditPost(user, post)) throw new AuthError("You can't edit this post.");
    if (await slugTaken("post", data.slug, post.id)) throw new UserError("Another post already uses this slug.", { slug: "Already in use." });
    const fields = {
      slug: data.slug, metaTitle: data.metaTitle || null, metaDescription: data.metaDescription || null, focusKeyword: data.focusKeyword || null,
      canonicalUrl: data.canonicalUrl || null, noIndex: data.noIndex, noFollow: data.noFollow,
    };
    const { score } = analyzeSeo({ ...post, ...fields, hasFeaturedImage: !!post.featuredImageId });
    await db.post.update({ where: { id: post.id }, data: { ...fields, seoScore: score } });
    revalidatePath("/admin/seo");
    revalidatePath(`/blog/${post.slug}`);
    if (post.slug !== data.slug) revalidatePath(`/blog/${data.slug}`);
    return { message: `SEO updated. New score: ${score}.` };
  });
}

const siteSeoSchema = z.object({
  titleSuffix: z.string().max(60, "Title suffix must be 60 characters or fewer."),
  defaultMetaDescription: z.string().trim().max(320, "Must be 320 characters or fewer."),
  searchIndexing: z.boolean(),
});

export async function saveSiteSeo(input: z.input<typeof siteSeoSchema>) {
  return run(async () => {
    await requireUser("seo.manage");
    const data = siteSeoSchema.parse(input);
    await saveSettings({ titleSuffix: data.titleSuffix, defaultMetaDescription: data.defaultMetaDescription, searchIndexing: String(data.searchIndexing) });
    revalidatePath("/", "layout");
    return { message: "Site SEO settings saved." };
  });
}
