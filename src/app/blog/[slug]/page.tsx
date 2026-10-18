import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getPublishedPost } from "@/lib/public-posts";
import { getSettings } from "@/lib/settings";
import { effectiveMetaDescription } from "@/lib/seo";
import { formatDate, mediaUrl, siteUrl } from "@/lib/utils";
import { PostArticle } from "@/components/site/post-article";
import { ViewTracker } from "@/components/site/view-tracker";
import { CommentForm } from "@/components/site/comment-form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPublishedPost(slug), getSettings()]);
  if (!post) return { title: "Not found" };
  const title = post.metaTitle || `${post.title}${settings.titleSuffix}`;
  const description = effectiveMetaDescription(post);
  const image = post.ogImage ?? post.featuredImage;
  const indexable = settings.searchIndexing === "true" && !post.noIndex;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: post.canonicalUrl || `${siteUrl()}/blog/${post.slug}` },
    robots: { index: indexable, follow: !post.noFollow },
    openGraph: {
      type: "article", title, description, url: `${siteUrl()}/blog/${post.slug}`, siteName: settings.siteName,
      publishedTime: post.publishedAt?.toISOString(), modifiedTime: post.updatedAt.toISOString(), authors: [post.author.name],
      images: image ? [{ url: `${siteUrl()}${mediaUrl(image.filename)}`, alt: image.alt ?? undefined }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  const [settings, comments] = await Promise.all([
    getSettings(),
    db.comment.findMany({ where: { postId: post.id, status: "approved" }, orderBy: { createdAt: "asc" }, select: { id: true, authorName: true, content: true, createdAt: true } }),
  ]);
  const commentsOpen = settings.commentsEnabled === "true";
  return (
    <>
      <PostArticle post={post} />
      {settings.trackingEnabled === "true" && <ViewTracker postId={post.id} />}
      <section className="mx-auto max-w-3xl px-4 pb-16" aria-labelledby="comments-heading">
        <h2 id="comments-heading" className="text-xl font-semibold">{comments.length ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Comments"}</h2>
        {comments.length > 0 && (
          <ol className="mt-6 space-y-6">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-border p-5">
                <p className="text-sm font-semibold">{c.authorName} <span className="ml-2 font-normal text-muted">{formatDate(c.createdAt, true)}</span></p>
                <p className="mt-2 whitespace-pre-line text-navy-700">{c.content}</p>
              </li>
            ))}
          </ol>
        )}
        {commentsOpen
          ? <CommentForm postId={post.id} moderated={settings.commentsRequireApproval === "true"} />
          : <p className="mt-6 text-sm text-muted">Comments are closed.</p>}
      </section>
    </>
  );
}
