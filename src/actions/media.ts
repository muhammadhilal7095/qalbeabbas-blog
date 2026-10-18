"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ci, db } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { run, UserError } from "@/lib/action";
import { can } from "@/lib/permissions";
import { deleteUpload } from "@/lib/storage";
import { mediaUrl } from "@/lib/utils";

export type MediaItem = {
  id: string; url: string; filename: string; originalName: string; mimeType: string; size: number;
  alt: string | null; caption: string | null; createdAt: string; uploadedBy?: string | null; uploadedById?: string | null;
};

export async function listMedia(opts: { q?: string; type?: string; page?: number; pageSize?: number }) {
  const user = await requireUser();
  if (!can(user.role, "media.upload") && !can(user.role, "posts.create")) throw new AuthError("Not allowed.");
  const where: Prisma.MediaWhereInput = {};
  if (opts.q) where.OR = [{ originalName: ci(opts.q) }, { alt: ci(opts.q) }, { caption: ci(opts.q) }];
  if (opts.type === "image") where.mimeType = { startsWith: "image/" };
  else if (opts.type === "video") where.mimeType = { startsWith: "video/" };
  else if (opts.type === "document") where.mimeType = "application/pdf";
  const pageSize = Math.min(60, opts.pageSize ?? 24);
  const page = Math.max(1, opts.page ?? 1);
  const [total, items] = await Promise.all([
    db.media.count({ where }),
    db.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { uploadedBy: { select: { name: true } } } }),
  ]);
  return {
    total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items: items.map<MediaItem>((m) => ({
      id: m.id, url: mediaUrl(m.filename), filename: m.filename, originalName: m.originalName, mimeType: m.mimeType, size: m.size,
      alt: m.alt, caption: m.caption, createdAt: m.createdAt.toISOString(), uploadedBy: m.uploadedBy?.name ?? null, uploadedById: m.uploadedById,
    })),
  };
}

async function ensureCanManage(id: string) {
  const user = await requireUser("media.upload");
  const media = await db.media.findUnique({ where: { id } });
  if (!media) throw new UserError("This file no longer exists.");
  if (!can(user.role, "media.manage_all") && media.uploadedById !== user.id) throw new AuthError("You can only change files you uploaded.");
  return media;
}

const metaSchema = z.object({
  id: z.string(),
  alt: z.string().trim().max(300, "Alt text must be 300 characters or fewer."),
  caption: z.string().trim().max(500, "Caption must be 500 characters or fewer."),
});

export async function updateMedia(input: z.input<typeof metaSchema>) {
  return run(async () => {
    const data = metaSchema.parse(input);
    await ensureCanManage(data.id);
    await db.media.update({ where: { id: data.id }, data: { alt: data.alt || null, caption: data.caption || null } });
    revalidatePath("/admin/media");
    return { message: "Details saved." };
  });
}

export type MediaUsage = { id: string; title: string; how: string }[];

export async function getMediaUsage(id: string): Promise<MediaUsage> {
  await requireUser("media.upload");
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return [];
  const posts = await db.post.findMany({
    where: { OR: [{ featuredImageId: id }, { ogImageId: id }, { content: { contains: media.filename } }] },
    select: { id: true, title: true, featuredImageId: true, ogImageId: true, content: true },
  });
  return posts.map((p) => ({
    id: p.id, title: p.title,
    how: [p.featuredImageId === id && "featured image", p.ogImageId === id && "social image", p.content.includes(media.filename) && "in content"].filter(Boolean).join(", "),
  }));
}

export async function deleteMedia(id: string, force = false) {
  return run(async () => {
    const media = await ensureCanManage(id);
    const usage = await getMediaUsage(id);
    if (usage.length && !force) throw new UserError(`This file is used in ${usage.length} post(s). Confirm to delete it anyway.`);
    if (usage.length && force) {
      const user = await requireUser();
      if (!can(user.role, "media.manage_all")) throw new AuthError("Only editors and administrators can delete files that are in use.");
    }
    await db.media.delete({ where: { id } });
    await deleteUpload(media.filename);
    revalidatePath("/admin/media");
    if (usage.length) revalidatePath("/admin/posts");
    return { message: usage.length ? `File deleted. Removed from ${usage.length} post(s); check those posts for broken images.` : "File deleted." };
  });
}
