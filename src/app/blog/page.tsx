import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FileText } from "lucide-react";
import { ci, db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, mediaUrl, param } from "@/lib/utils";
import { EmptyState, Pagination } from "@/components/ui/misc";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { absolute: s.siteName },
    description: s.defaultMetaDescription || s.siteTagline,
    robots: s.searchIndexing === "true" ? undefined : { index: false, follow: false },
  };
}

export default async function BlogIndex({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const pageSize = Number(settings.postsPerPage) || 10;
  const category = param(sp, "category");
  const tag = param(sp, "tag");
  const q = param(sp, "q")?.trim();

  const where: Prisma.PostWhereInput = { status: "published" };
  if (category) where.category = { slug: category };
  if (tag) where.tags = { some: { slug: tag } };
  if (q) where.OR = [{ title: ci(q) }, { excerpt: ci(q) }];

  const total = await db.post.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number(param(sp, "page")) || 1));
  const [posts, categories] = await Promise.all([
    db.post.findMany({
      where, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
      include: { author: { select: { name: true } }, category: { select: { name: true, slug: true } }, featuredImage: { select: { filename: true, alt: true } } },
    }),
    db.category.findMany({ where: { posts: { some: { status: "published" } } }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  const heading = category ? categories.find((c) => c.slug === category)?.name ?? "Category" : tag ? `#${tag}` : q ? `Results for “${q}”` : settings.siteName;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
      {!category && !tag && !q && <p className="mt-2 text-muted">{settings.siteTagline}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href="/blog" className={`rounded-full px-3 py-1 text-sm ${!category ? "bg-navy-900 text-white" : "bg-surface text-navy-700 hover:bg-slate-100"}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/blog?category=${c.slug}`} className={`rounded-full px-3 py-1 text-sm ${category === c.slug ? "bg-navy-900 text-white" : "bg-surface text-navy-700 hover:bg-slate-100"}`}>{c.name}</Link>
        ))}
        <form className="ml-auto" action="/blog">
          <input name="q" defaultValue={q} placeholder="Search posts…" aria-label="Search posts" className="h-9 rounded-full border border-border px-4 text-sm outline-none focus:border-primary" />
        </form>
      </div>
      {posts.length === 0 ? (
        <EmptyState className="mt-10" icon={FileText} title="No posts here yet" description="Check back soon for new articles." />
      ) : (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <article key={p.id} className="group">
              <Link href={`/blog/${p.slug}`} className="block overflow-hidden rounded-xl bg-surface">
                {p.featuredImage
                  ? <img src={mediaUrl(p.featuredImage.filename)} alt={p.featuredImage.alt ?? ""} className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
                  : <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary-soft to-slate-100" />}
              </Link>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                {p.featured && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">Featured</span>}
                {p.category && <span className="font-medium text-primary">{p.category.name}</span>}
                <span>{formatDate(p.publishedAt)}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold leading-snug"><Link href={`/blog/${p.slug}`} className="hover:text-primary">{p.title}</Link></h2>
              {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-navy-700">{p.excerpt}</p>}
              <p className="mt-3 text-xs text-muted">{p.author.name}{p.readingTime ? ` · ${p.readingTime} min read` : ""}</p>
            </article>
          ))}
        </div>
      )}
      <div className="mt-12"><Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} basePath="/blog" params={{ category, tag, q }} /></div>
    </div>
  );
}
