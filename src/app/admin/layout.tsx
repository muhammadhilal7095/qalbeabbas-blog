import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { publishDuePosts } from "@/lib/scheduler";
import { getSettings } from "@/lib/settings";
import { AdminShell } from "@/components/admin/shell";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  await publishDuePosts();
  const [settings, pendingComments, pendingReview] = await Promise.all([
    getSettings(),
    can(user.role, "comments.moderate") ? db.comment.count({ where: { status: "pending" } }) : 0,
    can(user.role, "posts.publish") && can(user.role, "posts.edit_all") ? db.post.count({ where: { status: "pending" } }) : 0,
  ]);
  return (
    <ConfirmProvider>
      <AdminShell user={user} siteName={settings.siteName} badges={{ comments: pendingComments, posts: pendingReview }}>
        {children}
      </AdminShell>
    </ConfirmProvider>
  );
}
