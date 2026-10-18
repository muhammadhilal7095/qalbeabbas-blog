export const ROLES = ["super_admin", "administrator", "editor", "author", "contributor"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  administrator: "Administrator",
  editor: "Editor",
  author: "Author",
  contributor: "Contributor",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full access, including managing other administrators.",
  administrator: "Full access to content, users and settings. Cannot manage Super Admins.",
  editor: "Manages and publishes all posts, taxonomy, media and comments.",
  author: "Writes, publishes and manages their own posts and uploads media.",
  contributor: "Writes drafts and submits them for review. Cannot publish.",
};

export const PERMISSIONS = {
  "posts.create": "Create posts",
  "posts.edit_own": "Edit own posts",
  "posts.edit_all": "Edit any post",
  "posts.publish": "Publish & schedule posts",
  "posts.delete_own": "Delete own posts",
  "posts.delete_all": "Delete any post",
  "taxonomy.manage": "Manage categories & tags",
  "media.upload": "Upload media",
  "media.manage_all": "Edit & delete any media",
  "comments.moderate": "Moderate comments",
  "analytics.view": "View analytics",
  "seo.manage": "Manage SEO",
  "users.manage": "Manage users & roles",
  "settings.manage": "Manage site settings",
} as const;
export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  administrator: ALL,
  editor: [
    "posts.create", "posts.edit_own", "posts.edit_all", "posts.publish", "posts.delete_own", "posts.delete_all",
    "taxonomy.manage", "media.upload", "media.manage_all", "comments.moderate", "analytics.view", "seo.manage",
  ],
  author: ["posts.create", "posts.edit_own", "posts.publish", "posts.delete_own", "media.upload", "analytics.view"],
  contributor: ["posts.create", "posts.edit_own", "posts.delete_own"],
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function can(role: string, permission: Permission) {
  return isRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}

export function roleRank(role: string) {
  return isRole(role) ? ROLES.length - ROLES.indexOf(role) : 0;
}

/** Whether `actor` may create/edit/delete a user who has (or would get) `targetRole`. */
export function canManageRole(actorRole: string, targetRole: string) {
  if (!can(actorRole, "users.manage")) return false;
  if (actorRole === "super_admin") return true;
  return targetRole !== "super_admin";
}

type PostLike = { authorId: string; status: string };

export function canEditPost(user: { id: string; role: string }, post: PostLike) {
  if (can(user.role, "posts.edit_all")) return true;
  if (post.authorId !== user.id || !can(user.role, "posts.edit_own")) return false;
  // Users without publish rights cannot alter content that is already live or queued.
  if (!can(user.role, "posts.publish")) return post.status === "draft" || post.status === "pending";
  return true;
}

export function canDeletePost(user: { id: string; role: string }, post: PostLike) {
  if (can(user.role, "posts.delete_all")) return true;
  if (post.authorId !== user.id || !can(user.role, "posts.delete_own")) return false;
  if (!can(user.role, "posts.publish")) return post.status === "draft" || post.status === "pending";
  return true;
}
