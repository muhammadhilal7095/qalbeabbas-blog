import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditPost } from "@/lib/permissions";
import { getEditorContext, toMediaItem } from "@/lib/editor-data";
import { PostEditor } from "@/components/editor/post-editor";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Edit Post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser("posts.create");
  const post = await db.post.findUnique({
    where: { id },
    include: { tags: { select: { id: true, name: true } }, featuredImage: true, ogImage: true },
  });
  if (!post) notFound();
  if (!canEditPost(user, post)) {
    return (
      <Card>
        <EmptyState icon={Lock} title="You can't edit this post"
          description={post.authorId === user.id ? "This post is published or scheduled. Ask an editor to make changes." : "You can only edit posts you've written."}
          action={<Link href="/admin/posts" className={buttonClasses("outline")}>Back to posts</Link>} />
      </Card>
    );
  }
  const ctx = await getEditorContext(user);
  return (
    <PostEditor
      key={post.id}
      {...ctx}
      initial={{
        id: post.id, title: post.title, slug: post.slug, content: post.content, excerpt: post.excerpt ?? "",
        status: post.status, featured: post.featured, categoryId: post.categoryId ?? "", tags: post.tags, authorId: post.authorId,
        featuredImage: toMediaItem(post.featuredImage),
        scheduledAt: "",
        publishedAt: post.publishedAt?.toISOString() ?? null, updatedAt: post.updatedAt.toISOString(),
        seo: {
          metaTitle: post.metaTitle ?? "", metaDescription: post.metaDescription ?? "", focusKeyword: post.focusKeyword ?? "",
          canonicalUrl: post.canonicalUrl ?? "", noIndex: post.noIndex, noFollow: post.noFollow, ogImage: toMediaItem(post.ogImage),
        },
      }}
      scheduledAtIso={post.scheduledAt?.toISOString() ?? null}
    />
  );
}
