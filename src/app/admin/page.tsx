import Link from "next/link";
import { BarChart3, CalendarClock, Eye, FilePen, FileText, MessageSquare, Send } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getPublishingActivity, getTraffic, parseRange, pctChange, RANGES } from "@/lib/analytics";
import { formatDate, param } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CommentStatusBadge, PostStatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { RangeFilter } from "@/components/admin/range-filter";
import { ColumnChart, TrendChart } from "@/components/admin/charts";
import { DeniedNotice } from "@/components/admin/denied-notice";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const range = parseRange(param(sp, "range"));
  const showAnalytics = can(user.role, "analytics.view");
  // Users who can only edit their own posts see their own numbers.
  const scope = can(user.role, "posts.edit_all") ? {} : { authorId: user.id };

  const [total, published, drafts, scheduled, totalViews, totalComments, pendingComments, traffic, publishing, recentPosts, recentComments] = await Promise.all([
    db.post.count({ where: scope }),
    db.post.count({ where: { ...scope, status: "published" } }),
    db.post.count({ where: { ...scope, status: "draft" } }),
    db.post.count({ where: { ...scope, status: "scheduled" } }),
    db.pageView.count({ where: scope.authorId ? { post: { authorId: user.id } } : {} }),
    db.comment.count({ where: scope.authorId ? { post: { authorId: user.id } } : {} }),
    db.comment.count({ where: { status: "pending", ...(scope.authorId ? { post: { authorId: user.id } } : {}) } }),
    showAnalytics ? getTraffic(range) : null,
    getPublishingActivity(range),
    db.post.findMany({ where: scope, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, status: true, updatedAt: true, author: { select: { name: true } } } }),
    can(user.role, "comments.moderate")
      ? db.comment.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, authorName: true, content: true, status: true, createdAt: true, post: { select: { title: true } } } })
      : [],
  ]);

  const hasTraffic = !!traffic && traffic.totalViews > 0;

  return (
    <>
      {param(sp, "denied") && <DeniedNotice />}
      <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} description="Here's what's happening with your blog." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Blog Posts" value={total} icon={FileText} href="/admin/posts" hint={scope.authorId ? "Your posts" : "All statuses"} />
        <StatCard label="Published Posts" value={published} icon={Send} href="/admin/posts?status=published" hint="Live on the website" />
        <StatCard label="Draft Posts" value={drafts} icon={FilePen} href="/admin/posts?status=draft" hint="Work in progress" />
        <StatCard label="Scheduled Posts" value={scheduled} icon={CalendarClock} href="/admin/posts?status=scheduled" hint="Queued for publishing" />
        <StatCard label="Total Blog Views" value={totalViews} icon={Eye} href={showAnalytics ? "/admin/analytics" : undefined} hint="All-time, tracked on the website" />
        <StatCard label="Total Comments" value={totalComments} icon={MessageSquare} href={can(user.role, "comments.moderate") ? "/admin/comments" : undefined}
          hint={pendingComments ? <span className="font-medium text-amber-700">{pendingComments} awaiting moderation</span> : "All moderated"} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Performance · {RANGES[range.key]}</h2>
        <RangeFilter value={range.key} basePath="/admin" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {showAnalytics && traffic && (
          <Card className="xl:col-span-2">
            <CardHeader title="Blog views & visitor trends"
              description={hasTraffic ? <>{traffic.totalViews.toLocaleString()} views from {traffic.uniqueVisitors.toLocaleString()} unique visitors{(() => { const c = pctChange(traffic.totalViews, traffic.prevViews); return c == null ? "" : ` · ${c >= 0 ? "+" : ""}${c}% vs previous period`; })()}</> : "Page views recorded on your public blog"}
              action={<Link href={`/admin/analytics?range=${range.key}`} className={buttonClasses("ghost", "sm")}>Full analytics</Link>} />
            <CardBody>
              {hasTraffic ? (
                <TrendChart data={traffic.series} series={[{ key: "views", label: "Views", color: "var(--color-series-1)" }, { key: "visitors", label: "Unique visitors", color: "var(--color-series-2)" }]} />
              ) : (
                <EmptyState icon={BarChart3} title="No visits recorded yet"
                  description="Views appear here as soon as readers open published posts on your website. Nothing is estimated or simulated." />
              )}
            </CardBody>
          </Card>
        )}
        <Card className={showAnalytics ? "" : "xl:col-span-3"}>
          <CardHeader title="Publishing activity" description={`Posts published per ${range.unit}`} />
          <CardBody>
            {publishing.some((p) => p.posts > 0)
              ? <ColumnChart data={publishing} series={{ key: "posts", label: "Posts published", color: "var(--color-series-1)" }} height={hasTraffic ? 272 : 240} />
              : <EmptyState icon={Send} title="Nothing published in this period" description="Published posts will be charted here." />}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recently updated posts" action={<Link href="/admin/posts" className={buttonClasses("ghost", "sm")}>View all</Link>} />
          {recentPosts.length ? (
            <ul className="divide-y divide-border">
              {recentPosts.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/posts/${p.id}/edit`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted">{p.author.name} · {formatDate(p.updatedAt, true)}</p>
                    </div>
                    <PostStatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} title="No posts yet" description="Your first post is a click away."
              action={can(user.role, "posts.create") && <Link href="/admin/posts/new" className={buttonClasses()}>Create a post</Link>} />
          )}
        </Card>
        {can(user.role, "comments.moderate") && (
          <Card>
            <CardHeader title="Latest comments" action={<Link href="/admin/comments" className={buttonClasses("ghost", "sm")}>Moderate</Link>} />
            {recentComments.length ? (
              <ul className="divide-y divide-border">
                {recentComments.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.authorName}</p>
                      <span className="truncate text-xs text-muted">on {c.post.title}</span>
                      <span className="ml-auto"><CommentStatusBadge status={c.status} /></span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-navy-700">{c.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={MessageSquare} title="No comments yet" description="Reader comments from your website will show up here." />
            )}
          </Card>
        )}
      </div>
    </>
  );
}
