import { z } from "zod";
import { SLUG_PATTERN } from "./slug";
import { ROLES } from "./permissions";

export const POST_STATUSES = ["draft", "pending", "scheduled", "published", "archived"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export const COMMENT_STATUSES = ["pending", "approved", "spam", "rejected"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`).optional().nullable()
    .transform((v) => (v ? v : null));

const slug = z.string().trim().min(1, "Slug is required.").max(120, "Slug must be 120 characters or fewer.")
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only.");

export const postInputSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().trim().min(1, "Title is required.").max(200, "Title must be 200 characters or fewer."),
  slug,
  content: z.string().max(2_000_000, "Content is too large."),
  excerpt: optionalText(500, "Excerpt"),
  categoryId: z.string().optional().nullable().transform((v) => v || null),
  tagIds: z.array(z.string()).max(30, "Use at most 30 tags."),
  newTags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  authorId: z.string().optional().nullable(),
  featured: z.boolean(),
  featuredImageId: z.string().optional().nullable().transform((v) => v || null),
  ogImageId: z.string().optional().nullable().transform((v) => v || null),
  metaTitle: optionalText(120, "Meta title"),
  metaDescription: optionalText(320, "Meta description"),
  focusKeyword: optionalText(100, "Focus keyword"),
  canonicalUrl: z.string().trim().max(500).optional().nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), "Canonical URL must start with http:// or https://"),
  noIndex: z.boolean(),
  noFollow: z.boolean(),
  scheduledAt: z.string().optional().nullable(),
  /** What the user asked for: keep current status, save as draft, submit, publish, schedule, autosave */
  intent: z.enum(["draft", "pending", "publish", "schedule", "update", "autosave"]),
  /** updatedAt the client last loaded, for conflict detection */
  baseUpdatedAt: z.string().optional().nullable(),
});
export type PostInput = z.input<typeof postInputSchema>;

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required.").max(80, "Name must be 80 characters or fewer."),
  slug,
  description: optionalText(500, "Description"),
  parentId: z.string().optional().nullable().transform((v) => v || null),
});

export const tagSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required.").max(50, "Name must be 50 characters or fewer."),
  slug,
});

const password = z.string().min(8, "Password must be at least 8 characters.").max(128)
  .regex(/[A-Za-z]/, "Password must contain a letter.").regex(/[0-9]/, "Password must contain a number.");

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(ROLES),
  password,
});
export const userUpdateSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(ROLES),
  active: z.boolean(),
  password: z.union([z.literal(""), password]).optional(),
});
export const passwordChangeSchema = z.object({
  current: z.string().min(1, "Enter your current password."),
  next: password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const commentSubmitSchema = z.object({
  postId: z.string().min(1),
  authorName: z.string().trim().min(1, "Name is required.").max(80),
  authorEmail: z.string().trim().email("Enter a valid email address.").max(200),
  authorUrl: z.string().trim().max(200).optional().transform((v) => v || null)
    .refine((v) => !v || /^https?:\/\//i.test(v), "Website must start with http:// or https://"),
  content: z.string().trim().min(2, "Comment is too short.").max(5000, "Comment must be 5000 characters or fewer."),
  website2: z.string().optional(), // honeypot
});

export const settingsSchema = z.object({
  siteName: z.string().trim().min(1, "Site name is required.").max(80),
  siteTagline: z.string().trim().max(160),
  postsPerPage: z.coerce.number().int().min(1, "At least 1.").max(50, "At most 50.").transform(String),
  commentsEnabled: z.boolean().transform(String),
  commentsRequireApproval: z.boolean().transform(String),
  trackingEnabled: z.boolean().transform(String),
  searchIndexing: z.boolean().transform(String),
  titleSuffix: z.string().max(60),
  defaultMetaDescription: z.string().trim().max(320),
});
