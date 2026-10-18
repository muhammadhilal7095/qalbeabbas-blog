import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|monitor/i;
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|baidu|yandex|ecosia|brave|startpage)\./i;
const SOCIAL = /(^|\.)(facebook|fb|instagram|t\.co|twitter|x\.com|linkedin|lnkd|reddit|pinterest|youtube|tiktok|threads|mastodon|bsky|news\.ycombinator)/i;

const viewSchema = z.object({
  type: z.literal("view"),
  postId: z.string().max(40),
  path: z.string().max(300),
  referrer: z.string().max(500).nullable().optional(),
  utmSource: z.string().max(100).nullable().optional(),
  utmMedium: z.string().max(100).nullable().optional(),
});
const engagementSchema = z.object({ type: z.literal("engagement"), viewId: z.string().max(40), seconds: z.number().int().min(1).max(86400) });

function classify(referrerHost: string | null, utmSource?: string | null, utmMedium?: string | null) {
  if (utmMedium && /e-?mail|newsletter/i.test(utmMedium)) return "email";
  if (utmSource) return "campaign";
  if (!referrerHost) return "direct";
  if (SEARCH.test(referrerHost)) return "search";
  if (SOCIAL.test(referrerHost)) return "social";
  return "referral";
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return NextResponse.json({ ok: true, skipped: "bot" });
  // Don't count signed-in staff browsing their own site.
  if (req.cookies.get("bms_session")) return NextResponse.json({ ok: true, skipped: "staff" });

  const body = await req.json().catch(() => null);
  const eng = engagementSchema.safeParse(body);
  if (eng.success) {
    // Only the visitor who created the view can report its duration, once, within 6 hours.
    const vid = req.cookies.get("bms_vid")?.value;
    if (!vid) return NextResponse.json({ ok: false }, { status: 400 });
    const visitorId = hash(vid);
    await db.pageView.updateMany({
      where: { id: eng.data.viewId, visitorId, durationSec: null, createdAt: { gte: new Date(Date.now() - 6 * 3600_000) } },
      data: { durationSec: Math.min(eng.data.seconds, 3600) },
    });
    return NextResponse.json({ ok: true });
  }

  const parsed = viewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const settings = await getSettings();
  if (settings.trackingEnabled !== "true") return NextResponse.json({ ok: true, skipped: "disabled" });
  const post = await db.post.findFirst({ where: { id: parsed.data.postId, status: "published" }, select: { id: true } });
  if (!post) return NextResponse.json({ ok: false }, { status: 404 });

  let referrerHost: string | null = null;
  try {
    if (parsed.data.referrer) {
      const h = new URL(parsed.data.referrer).host;
      if (h && h !== req.headers.get("host")) referrerHost = h.replace(/^www\./, "");
    }
  } catch { /* ignore malformed referrers */ }

  let vid = req.cookies.get("bms_vid")?.value;
  const isNew = !vid || !/^[0-9a-f-]{36}$/.test(vid);
  if (isNew) vid = randomUUID();

  const view = await db.pageView.create({
    data: {
      postId: post.id, path: parsed.data.path, visitorId: hash(vid!), referrer: referrerHost,
      source: classify(referrerHost, parsed.data.utmSource, parsed.data.utmMedium), utmSource: parsed.data.utmSource || null,
    },
  });
  const res = NextResponse.json({ ok: true, viewId: view.id });
  if (isNew) {
    res.cookies.set("bms_vid", vid!, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 86400 });
  }
  return res;
}

function hash(v: string) {
  return createHash("sha256").update(`${process.env.ANALYTICS_SALT ?? ""}:${v}`).digest("hex").slice(0, 32);
}
