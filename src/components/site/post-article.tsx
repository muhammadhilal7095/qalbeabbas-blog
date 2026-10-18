import Link from "next/link";
import { Clock } from "lucide-react";
import { formatDate, mediaUrl } from "@/lib/utils";

type ArticlePost = {
  title: string; content: string; excerpt: string | null; readingTime: number; publishedAt: Date | null; createdAt: Date;
  author: { name: string; bio?: string | null }; category: { name: string; slug: string } | null; tags: { name: string; slug: string }[];
  featuredImage: { filename: string; alt: string | null; caption: string | null } | null;
};

/** Content is sanitized on save (src/lib/sanitize.ts) before it is rendered here. */
export function PostArticle({ post }: { post: ArticlePost }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header>
        {post.category && <Link href={`/blog?category=${post.category.slug}`} className="text-sm font-semibold text-primary hover:underline">{post.category.name}</Link>}
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-navy-900 sm:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-lg text-navy-700">{post.excerpt}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="font-medium text-navy-900">{post.author.name}</span>
          <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>{formatDate(post.publishedAt ?? post.createdAt)}</time>
          {post.readingTime > 0 && <span className="flex items-center gap-1"><Clock className="size-3.5" />{post.readingTime} min read</span>}
        </div>
      </header>
      {post.featuredImage && (
        <figure className="mt-8">
          <img src={mediaUrl(post.featuredImage.filename)} alt={post.featuredImage.alt ?? ""} className="aspect-[2/1] w-full rounded-2xl object-cover" />
          {post.featuredImage.caption && <figcaption className="mt-2 text-center text-sm text-muted">{post.featuredImage.caption}</figcaption>}
        </figure>
      )}
      <div className="post-body prose prose-slate prose-lg mt-10 max-w-none prose-headings:text-navy-900 prose-a:text-primary prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: post.content }} />
      {post.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
          {post.tags.map((t) => <Link key={t.slug} href={`/blog?tag=${t.slug}`} className="rounded-full bg-surface px-3 py-1 text-sm text-navy-700 hover:bg-primary-soft hover:text-primary">#{t.name}</Link>)}
        </div>
      )}
    </article>
  );
}
