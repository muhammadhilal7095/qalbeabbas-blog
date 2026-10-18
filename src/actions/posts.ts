"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { run, UserError } from "@/lib/action";
import { can, canDeletePost, canEditPost } from "@/lib/permissions";
import { postInputSchema, type PostInput } from "@/lib/validation";
import { sanitizePostHtml } from "@/lib/sanitize";
import { analyzeSeo } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { slugTaken, uniqueSlug } from "@/lib/unique-slug";
import { countWords, readingTime, stripHtml } from "@/lib/utils";

function revalidateContent(slug?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function savePost(raw: PostInput) {
  return run(async () => {
    const user = await requireUser("posts.create");
    const input = postInputSchema.parse(raw);
    const existing = input.id ? await db.post.findUnique({ where: { id: input.id }, include: { tags: { select: { id: true } } } }) : null;
    if (input.id && !existing) throw new UserError("This post no longer exists. It may have been deleted.");
    if (existing && !canEditPost(user, existing)) {
      throw new AuthError(existing.status === "published" || existing.status === "scheduled"
        ? "This post is live or scheduled. Only users with publishing rights can change it."
        : "You can only edit your own posts.");
    }

    // Optimistic concurrency: refuse to overwrite someone else's newer save.
    if (existing && input.baseUpdatedAt && input.intent !== "autosave") {
      if (existing.updatedAt.getTime() - new Date(input.baseUpdatedAt).getTime() > 1000) {
        throw new UserError("This post was changed elsewhere since you opened it. Copy your changes, reload the page, and try again.");
      }
    }

    const canPublish = can(user.role, "posts.publish");
    const now = new Date();
    let status = existing?.status ?? "draft";
    let publishedAt = existing?.publishedAt ?? null;
    let scheduledAt = existing?.scheduledAt ?? null;

    const parseSchedule = () => {
      const d = input.scheduledAt ? new Date(input.scheduledAt) : null;
      if (!d || Number.isNaN(d.getTime())) throw new UserError("Choose a valid date and time to schedule this post.", { scheduledAt: "Pick a date and time." });
      if (d.getTime() <= now.getTime() + 60_000) throw new UserError("The scheduled time must be in the future.", { scheduledAt: "Must be at least a minute in the future." });
      return d;
    };

    switch (input.intent) {
      case "draft":
        status = "draft"; scheduledAt = null;
        break;
      case "pending":
        status = "pending"; scheduledAt = null;
        break;
      case "publish":
        if (!canPublish) throw new AuthError("You don't have permission to publish. Submit the post for review instead.");
        if (status !== "published") publishedAt = now;
        status = "published"; scheduledAt = null;
        break;
      case "schedule":
        if (!canPublish) throw new AuthError("You don't have permission to schedule posts. Submit the post for review instead.");
        scheduledAt = parseSchedule(); status = "scheduled"; publishedAt = null;
        break;
      case "update":
        if (status === "scheduled" && input.scheduledAt) scheduledAt = parseSchedule();
        break;
      case "autosave":
        if (existing && !["draft", "pending"].includes(existing.status)) {
          throw new UserError("Autosave only applies to drafts.");
        }
        break;
    }

    // Slug: autosave silently de-duplicates, explicit saves report the conflict.
    let slug = input.slug;
    if (await slugTaken("post", slug, existing?.id)) {
      if (input.intent === "autosave" || !existing) slug = await uniqueSlug("post", slug, existing?.id);
      if (input.intent !== "autosave" && slug === input.slug) {
        const suggestion = await uniqueSlug("post", input.slug, existing?.id);
        throw new UserError("Another post already uses this URL slug.", { slug: `Already in use. Try “${suggestion}”.` });
      }
    }

    // Relations
    let authorId = existing?.authorId ?? user.id;
    if (input.authorId && input.authorId !== authorId) {
      if (!can(user.role, "posts.edit_all")) throw new AuthError("You can't change the author of a post.");
      const author = await db.user.findFirst({ where: { id: input.authorId, active: true } });
      if (!author) throw new UserError("The selected author doesn't exist or is inactive.", { authorId: "Choose another author." });
      authorId = author.id;
    }
    if (input.categoryId && !(await db.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))) {
      throw new UserError("The selected category no longer exists.", { categoryId: "Choose another category." });
    }
    for (const mid of [input.featuredImageId, input.ogImageId]) {
      if (mid && !(await db.media.findUnique({ where: { id: mid }, select: { id: true } }))) {
        throw new UserError("A selected image no longer exists in the media library.");
      }
    }
    const tagIds = new Set(input.tagIds);
    for (const name of input.newTags) {
      const tagSlug = slugify(name);
      if (!tagSlug) continue;
      const tag = await db.tag.upsert({ where: { slug: tagSlug }, update: {}, create: { name, slug: tagSlug } });
      tagIds.add(tag.id);
    }
    const validTags = await db.tag.findMany({ where: { id: { in: [...tagIds] } }, select: { id: true } });

    const content = sanitizePostHtml(input.content);
    const words = countWords(stripHtml(content));
    const { score } = analyzeSeo({ ...input, slug, content, hasFeaturedImage: !!input.featuredImageId });

    const data = {
      title: input.title, slug, content, excerpt: input.excerpt, status, featured: input.featured,
      publishedAt, scheduledAt, authorId, categoryId: input.categoryId,
      featuredImageId: input.featuredImageId, ogImageId: input.ogImageId,
      metaTitle: input.metaTitle, metaDescription: input.metaDescription, focusKeyword: input.focusKeyword,
      canonicalUrl: input.canonicalUrl, noIndex: input.noIndex, noFollow: input.noFollow,
      seoScore: score, wordCount: words, readingTime: readingTime(words),
    };

    const post = existing
      ? await db.post.update({ where: { id: existing.id }, data: { ...data, tags: { set: validTags } } })
      : await db.post.create({ data: { ...data, tags: { connect: validTags } } });

    revalidateContent(post.slug);
    if (existing && existing.slug !== post.slug) revalidatePath(`/blog/${existing.slug}`);

    const messages: Record<string, string> = {
      draft: "Draft saved.",
      pending: "Submitted for review. An editor will be notified in the dashboard.",
      publish: existing?.status === "published" ? "Post updated." : "Post published.",
      schedule: `Scheduled for ${scheduledAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`,
      update: "Changes saved.",
      autosave: "Autosaved.",
    };
    return {
      message: messages[input.intent],
      data: { id: post.id, slug: post.slug, status: post.status, updatedAt: post.updatedAt.toISOString(), seoScore: post.seoScore },
    };
  });
}

export async function duplicatePost(id: string) {
  return run(async () => {
    const user = await requireUser("posts.create");
    const src = await db.post.findUnique({ where: { id }, include: { tags: { select: { id: true } } } });
    if (!src) throw new UserError("Post not found.");
    if (!can(user.role, "posts.edit_all") && src.authorId !== user.id) throw new AuthError("You can only duplicate your own posts.");
    const slug = await uniqueSlug("post", `${src.slug}-copy`.slice(0, 110));
    const copy = await db.post.create({
      data: {
        title: `${src.title} (Copy)`.slice(0, 200), slug, content: src.content, excerpt: src.excerpt, status: "draft",
        featured: false, authorId: user.id, categoryId: src.categoryId, featuredImageId: src.featuredImageId, ogImageId: src.ogImageId,
        metaTitle: src.metaTitle, metaDescription: src.metaDescription, focusKeyword: src.focusKeyword, canonicalUrl: null,
        noIndex: src.noIndex, noFollow: src.noFollow, seoScore: src.seoScore, wordCount: src.wordCount, readingTime: src.readingTime,
        tags: { connect: src.tags },
      },
    });
    revalidateContent();
    return { message: "Post duplicated as a draft.", data: { id: copy.id } };
  });
}

type BulkAction = "publish" | "draft" | "archive" | "restore" | "delete";

async function applyAction(user: { id: string; role: string }, ids: string[], action: BulkAction) {
  const posts = await db.post.findMany({ where: { id: { in: ids } } });
  let done = 0, skipped = 0;
  const now = new Date();
  for (const p of posts) {
    const allowed = action === "delete" ? canDeletePost(user, p)
      : action === "publish" ? can(user.role, "posts.publish") && canEditPost(user, p)
      : action === "archive" || action === "restore" ? can(user.role, "posts.publish") && canEditPost(user, p)
      : canEditPost(user, p);
    if (!allowed) { skipped++; continue; }
    if (action === "delete") await db.post.delete({ where: { id: p.id } });
    else if (action === "publish") await db.post.update({ where: { id: p.id }, data: { status: "published", publishedAt: p.status === "published" ? p.publishedAt : now, scheduledAt: null } });
    else if (action === "draft") await db.post.update({ where: { id: p.id }, data: { status: "draft", scheduledAt: null } });
    else if (action === "archive") await db.post.update({ where: { id: p.id }, data: { status: "archived", scheduledAt: null, featured: false } });
    else if (action === "restore") { if (p.status !== "archived") { skipped++; continue; } await db.post.update({ where: { id: p.id }, data: { status: "draft" } }); }
    done++;
    revalidatePath(`/blog/${p.slug}`);
  }
  revalidateContent();
  return { done, skipped: skipped + (ids.length - posts.length) };
}

const VERBS: Record<BulkAction, string> = { publish: "published", draft: "moved to drafts", archive: "archived", restore: "restored to drafts", delete: "permanently deleted" };

export async function postAction(ids: string[], action: BulkAction) {
  return run(async () => {
    const user = await requireUser();
    if (!ids.length) throw new UserError("Select at least one post.");
    if (ids.length > 200) throw new UserError("You can update at most 200 posts at once.");
    const { done, skipped } = await applyAction(user, ids, action);
    if (!done) throw new UserError(skipped ? "You don't have permission to do that for the selected post(s)." : "Nothing to update.");
    return { message: `${done} post${done === 1 ? "" : "s"} ${VERBS[action]}.${skipped ? ` ${skipped} skipped (no permission or not applicable).` : ""}` };
  });
}
