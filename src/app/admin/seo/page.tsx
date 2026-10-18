import type { Prisma } from "@prisma/client";
import { AlertCircle, EyeOff, Gauge, ImageOff, KeyRound, FileWarning } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { ci, db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { param, siteUrl } from "@/lib/utils";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { SeoTable } from "@/components/admin/seo/seo-table";
import { SiteSeoForm } from "@/components/admin/seo/site-seo-form";

export const metadata = { title: "SEO Management" };
const PAGE_SIZE = 20;

export default async function SeoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser("seo.manage");
  const sp = await searchParams;
  const issue = param(sp, "issue");
  const q = param(sp, "q")?.trim() || undefined;
  const base: Prisma.PostWhereInput = { status: { not: "archived" } };
  const issueWhere: Record<string, Prisma.PostWhereInput> = {
    poor: { seoScore: { lt: 50 } },
    desc: { OR: [{ metaDescription: null }, { metaDescription: "" }] },
    keyword: { OR: [{ focusKeyword: null }, { focusKeyword: "" }] },
    image: { featuredImageId: null },
    noindex: { noIndex: true },
  };
  const where: Prisma.PostWhereInput = { ...base, ...(issue && issueWhere[issue] ? issueWhere[issue] : {}), ...(q ? { title: ci(q) } : {}) };

  const [settings, avg, poor, noDesc, noKeyword, noImage, noIndex, imagesNoAlt, total] = await Promise.all([
    getSettings(),
    db.post.aggregate({ where: base, _avg: { seoScore: true } }),
    db.post.count({ where: { ...base, ...issueWhere.poor } }),
    db.post.count({ where: { ...base, ...issueWhere.desc } }),
    db.post.count({ where: { ...base, ...issueWhere.keyword } }),
    db.post.count({ where: { ...base, ...issueWhere.image } }),
    db.post.count({ where: { ...base, ...issueWhere.noindex } }),
    db.media.count({ where: { mimeType: { startsWith: "image/" }, OR: [{ alt: null }, { alt: "" }] } }),
    db.post.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(param(sp, "page")) || 1));
  const posts = await db.post.findMany({
    where, orderBy: [{ seoScore: "asc" }, { updatedAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    select: { id: true, title: true, slug: true, status: true, seoScore: true, metaTitle: true, metaDescription: true, focusKeyword: true, canonicalUrl: true, noIndex: true, noFollow: true, featuredImageId: true },
  });

  return (
    <>
      <PageHeader title="SEO Management" description="Find and fix search optimization issues across all posts." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Average SEO score" value={Math.round(avg._avg.seoScore ?? 0)} icon={Gauge} hint="Across non-archived posts" />
        <StatCard label="Posts scoring below 50" value={poor} icon={AlertCircle} href="/admin/seo?issue=poor" hint="Need the most attention" />
        <StatCard label="Missing meta description" value={noDesc} icon={FileWarning} href="/admin/seo?issue=desc" hint="Search engines will improvise a snippet" />
        <StatCard label="Missing focus keyword" value={noKeyword} icon={KeyRound} href="/admin/seo?issue=keyword" hint="Can't be scored for relevance" />
        <StatCard label="Missing featured image" value={noImage} icon={ImageOff} href="/admin/seo?issue=image" hint={`${imagesNoAlt} library image${imagesNoAlt === 1 ? "" : "s"} missing alt text`} />
        <StatCard label="Hidden from search (noindex)" value={noIndex} icon={EyeOff} href="/admin/seo?issue=noindex" hint={settings.searchIndexing === "true" ? "Per-post setting" : "Site-wide indexing is OFF"} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <SeoTable posts={posts} issue={issue} q={q} siteUrl={siteUrl()} />
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/admin/seo" params={{ issue, q }} />
        </Card>
        <SiteSeoForm initial={{ titleSuffix: settings.titleSuffix, defaultMetaDescription: settings.defaultMetaDescription, searchIndexing: settings.searchIndexing === "true" }} siteUrl={siteUrl()} />
      </div>
    </>
  );
}
