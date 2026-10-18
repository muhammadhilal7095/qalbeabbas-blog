import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canEditPost } from "@/lib/permissions";
import { publicPostInclude } from "@/lib/public-posts";
import { PostArticle } from "@/components/site/post-article";
import { PostStatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Preview" };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const post = await db.post.findUnique({ where: { id }, include: publicPostInclude });
  if (!post || (!can(user.role, "posts.edit_all") && post.authorId !== user.id)) notFound();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-primary-soft px-4 py-3 text-sm">
        <span className="font-medium text-primary">Preview mode</span>
        <PostStatusBadge status={post.status} />
        <span className="text-muted">This is how the saved version of the post looks to readers.</span>
        {canEditPost(user, post) && <Link href={`/admin/posts/${post.id}/edit`} className={buttonClasses("outline", "sm", "ml-auto")}><Pencil />Edit post</Link>}
      </div>
      <Card><PostArticle post={post} /></Card>
    </>
  );
}
