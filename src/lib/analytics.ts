import "server-only";
import { db } from "./db";

export const RANGES = { "7d": "Last 7 days", "30d": "Last 30 days", "12m": "Last 12 months" } as const;
export type RangeKey = keyof typeof RANGES;

export type Range = { key: RangeKey; start: Date; end: Date; prevStart: Date; unit: "day" | "month"; buckets: { key: string; label: string }[] };

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function parseRange(value: string | undefined): Range {
  const key: RangeKey = value === "7d" || value === "12m" ? value : "30d";
  const end = new Date();
  const buckets: Range["buckets"] = [];
  let start: Date, prevStart: Date, unit: Range["unit"];
  if (key === "12m") {
    unit = "month";
    start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    prevStart = new Date(start.getFullYear() - 1, start.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      buckets.push({ key: monthKey(d), label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) });
    }
  } else {
    unit = "day";
    const days = key === "7d" ? 7 : 30;
    start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
    prevStart = new Date(start.getTime() - days * 86400_000);
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      buckets.push({ key: dayKey(d), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    }
  }
  return { key, start, end, prevStart, unit, buckets };
}

const bucketOf = (r: Range, d: Date) => (r.unit === "month" ? monthKey(d) : dayKey(d));

export type TrafficPoint = { label: string; views: number; visitors: number };

/** Views and unique visitors per bucket, plus totals for the current and previous period. */
export async function getTraffic(range: Range, opts: { postId?: string } = {}) {
  const rows = await db.pageView.findMany({
    where: { createdAt: { gte: range.prevStart }, ...(opts.postId ? { postId: opts.postId } : {}) },
    select: { createdAt: true, visitorId: true, durationSec: true },
  });
  const views = new Map<string, number>();
  const visitors = new Map<string, Set<string>>();
  const allVisitors = new Set<string>();
  let prevViews = 0;
  const prevVisitors = new Set<string>();
  let durSum = 0, durCount = 0;
  for (const r of rows) {
    if (r.createdAt < range.start) { prevViews++; prevVisitors.add(r.visitorId); continue; }
    const k = bucketOf(range, r.createdAt);
    views.set(k, (views.get(k) ?? 0) + 1);
    if (!visitors.has(k)) visitors.set(k, new Set());
    visitors.get(k)!.add(r.visitorId);
    allVisitors.add(r.visitorId);
    if (r.durationSec != null) { durSum += r.durationSec; durCount++; }
  }
  const series: TrafficPoint[] = range.buckets.map((b) => ({ label: b.label, views: views.get(b.key) ?? 0, visitors: visitors.get(b.key)?.size ?? 0 }));
  const totalViews = series.reduce((s, p) => s + p.views, 0);
  return {
    series,
    totalViews,
    uniqueVisitors: allVisitors.size,
    prevViews,
    prevVisitors: prevVisitors.size,
    avgEngagementSec: durCount ? Math.round(durSum / durCount) : null,
    engagementSamples: durCount,
  };
}

export async function getPublishingActivity(range: Range) {
  const rows = await db.post.findMany({
    where: { publishedAt: { gte: range.start, lte: range.end }, status: { in: ["published", "archived"] } },
    select: { publishedAt: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = bucketOf(range, r.publishedAt!);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return range.buckets.map((b) => ({ label: b.label, posts: counts.get(b.key) ?? 0 }));
}

export async function getTopPosts(range: Range, limit = 5) {
  const grouped = await db.pageView.groupBy({
    by: ["postId"],
    where: { createdAt: { gte: range.start }, postId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { postId: "desc" } },
    take: limit,
  });
  const posts = await db.post.findMany({
    where: { id: { in: grouped.map((g) => g.postId!) } },
    select: { id: true, title: true, slug: true, status: true, category: { select: { name: true } } },
  });
  const uniques = await Promise.all(
    grouped.map((g) => db.pageView.findMany({ where: { postId: g.postId, createdAt: { gte: range.start } }, distinct: ["visitorId"], select: { visitorId: true } })),
  );
  return grouped
    .map((g, i) => ({ post: posts.find((p) => p.id === g.postId), views: g._count._all, visitors: uniques[i].length }))
    .filter((r) => r.post);
}

export const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct", search: "Search engines", social: "Social media", referral: "Referral sites", email: "Email", campaign: "Campaigns",
};

export async function getTrafficSources(range: Range) {
  const grouped = await db.pageView.groupBy({
    by: ["source"], where: { createdAt: { gte: range.start } }, _count: { _all: true },
  });
  return grouped.map((g) => ({ source: SOURCE_LABELS[g.source] ?? g.source, views: g._count._all })).sort((a, b) => b.views - a.views);
}

export async function getTopReferrers(range: Range, limit = 8) {
  const grouped = await db.pageView.groupBy({
    by: ["referrer"], where: { createdAt: { gte: range.start }, referrer: { not: null } },
    _count: { _all: true }, orderBy: { _count: { referrer: "desc" } }, take: limit,
  });
  return grouped.map((g) => ({ referrer: g.referrer!, views: g._count._all }));
}

export async function getTopCategories(range: Range) {
  const views = await db.pageView.groupBy({
    by: ["postId"], where: { createdAt: { gte: range.start }, postId: { not: null } }, _count: { _all: true },
  });
  if (!views.length) return [];
  const posts = await db.post.findMany({
    where: { id: { in: views.map((v) => v.postId!) } },
    select: { id: true, category: { select: { id: true, name: true } } },
  });
  const totals = new Map<string, { name: string; views: number; posts: Set<string> }>();
  for (const v of views) {
    const cat = posts.find((p) => p.id === v.postId)?.category ?? { id: "_none", name: "Uncategorized" };
    const t = totals.get(cat.id) ?? { name: cat.name, views: 0, posts: new Set() };
    t.views += v._count._all;
    t.posts.add(v.postId!);
    totals.set(cat.id, t);
  }
  return [...totals.values()].map((t) => ({ name: t.name, views: t.views, posts: t.posts.size })).sort((a, b) => b.views - a.views);
}

export function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}
