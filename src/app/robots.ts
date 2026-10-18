import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  if (settings.searchIndexing !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/login"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
