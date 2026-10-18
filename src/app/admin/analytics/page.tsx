import Link from "next/link";
import { BarChart3, Clock, Eye, FolderTree, Globe, Info, Repeat, Users } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getTopCategories, getTopPosts, getTopReferrers, getTraffic, getTrafficSources, parseRange, pctChange, RANGES } from "@/lib/analytics";
import { formatDuration, formatNumber, param } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PostStatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import { RangeFilter } from "@/components/admin/range-filter";
import { TrendChart } from "@/components/admin/charts";
import { BarList } from "@/components/admin/bar-list";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageUser("analytics.view");
  const sp = await searchParams;
  const range = parseRange(param(sp, "range"));
  const [settings, traffic, topPosts, sources, referrers, categories] = await Promise.all([
    getSettings(), getTraffic(range), getTopPosts(range, 10), getTrafficSources(range), getTopReferrers(range), getTopCategories(range),
  ]);
  const hasData = traffic.totalViews > 0;
  const viewsChange = pctChange(traffic.totalViews, traffic.prevViews);
  const visitorsChange = pctChange(traffic.uniqueVisitors, traffic.prevVisitors);
  const periodLabel = RANGES[range.key].toLowerCase();

  return (
    <>
      <PageHeader title="Analytics" description="Real traffic recorded on your public blog. Bots and signed-in team members are excluded."
        actions={<RangeFilter value={range.key} basePath="/admin/analytics" />} />

      {settings.trackingEnabled !== "true" && (
        <div role="status" className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="size-4 shrink-0" />Visitor tracking is turned off, so no new data is being collected. <Link href="/admin/settings" className="font-medium underline">Turn it on in Settings</Link>.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total page views" value={traffic.totalViews} icon={Eye} change={hasData ? viewsChange : null} hint={`vs previous ${range.key === "12m" ? "12 months" : range.key === "7d" ? "7 days" : "30 days"}`} />
        <StatCard label="Unique visitors" value={traffic.uniqueVisitors} icon={Users} change={hasData ? visitorsChange : null} hint="Distinct anonymous browsers" />
        <StatCard label="Avg. engagement time" value={traffic.avgEngagementSec ?? 0} icon={Clock}
          display={traffic.avgEngagementSec == null ? "—" : formatDuration(traffic.avgEngagementSec)}
          hint={traffic.avgEngagementSec == null ? "No engagement data yet" : `From ${traffic.engagementSamples.toLocaleString()} tracked visits`} />
        <StatCard label="Views per visitor" value={0} icon={Repeat}
          display={traffic.uniqueVisitors ? (traffic.totalViews / traffic.uniqueVisitors).toFixed(2) : "—"} hint={`Average ${periodLabel}`} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Views by date" description={`Page views and unique visitors per ${range.unit}`} />
        <CardBody>
          {hasData
            ? <TrendChart data={traffic.series} height={320} series={[{ key: "views", label: "Views", color: "var(--color-series-1)" }, { key: "visitors", label: "Unique visitors", color: "var(--color-series-2)" }]} />
            : <EmptyState icon={BarChart3} title={`No visits recorded in the ${periodLabel}`} description="Charts fill in automatically as readers visit your published posts. No sample or estimated data is ever shown." />}
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Most popular posts" description={`Ranked by views, ${periodLabel}`} />
          {topPosts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="w-10 px-4 py-2.5">#</th><th className="px-3 py-2.5">Post</th><th className="px-3 py-2.5 text-right">Views</th><th className="px-3 py-2.5 text-right">Visitors</th><th className="px-4 py-2.5 text-right">Share</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {topPosts.map((r, i) => (
                    <tr key={r.post!.id} className="hover:bg-surface/60">
                      <td className="px-4 py-3 tabular-nums text-muted">{i + 1}</td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/posts/${r.post!.id}/edit`} className="font-medium hover:text-primary">{r.post!.title}</Link>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">{r.post!.category?.name ?? "Uncategorized"}{r.post!.status !== "published" && <PostStatusBadge status={r.post!.status} />}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatNumber(r.views)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(r.visitors)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{Math.round((r.views / traffic.totalViews) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon={Eye} title="No post views yet" description="Your most-read posts will be ranked here." />}
        </Card>
        <Card>
          <CardHeader title="Traffic sources" description="Where visitors came from" />
          <CardBody>
            {sources.length ? <BarList valueLabel="views" items={sources.map((s) => ({ label: s.source, value: s.views }))} />
              : <EmptyState icon={Globe} title="No traffic yet" description="Sources are detected from referrers and UTM tags." />}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top categories" description={`Views by post category, ${periodLabel}`} />
          <CardBody>
            {categories.length ? <BarList valueLabel="views" items={categories.map((c) => ({ label: c.name, value: c.views, sub: `${c.posts} post${c.posts === 1 ? "" : "s"} viewed` }))} />
              : <EmptyState icon={FolderTree} title="No category data yet" description="Appears once categorized posts get views." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top referring sites" description="External websites linking to your posts" />
          <CardBody>
            {referrers.length ? <BarList valueLabel="views" items={referrers.map((r) => ({ label: r.referrer, value: r.views }))} />
              : <EmptyState icon={Globe} title="No referrals yet" description="Visits from other websites will be listed here." />}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
