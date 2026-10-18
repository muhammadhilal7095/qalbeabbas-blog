"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { saveSiteSeo } from "@/actions/seo";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Switch, Textarea } from "@/components/ui/input";

export function SiteSeoForm({ initial, siteUrl }: { initial: { titleSuffix: string; defaultMetaDescription: string; searchIndexing: boolean }; siteUrl: string }) {
  const router = useRouter();
  const [f, setF] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveSiteSeo(f);
    setSaving(false);
    if (res.ok) { toast.success(res.message); setErrors({}); router.refresh(); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };
  return (
    <Card className="h-fit">
      <CardHeader title="Site-wide SEO" description="Defaults applied across your blog." />
      <form onSubmit={save}>
        <CardBody className="space-y-4">
          <label className="flex items-start justify-between gap-3 text-sm">
            <span><span className="font-medium">Search engine visibility</span><span className="block text-xs text-muted">Turn off to ask search engines not to index the whole site.</span></span>
            <Switch checked={f.searchIndexing} onCheckedChange={(v) => setF({ ...f, searchIndexing: v })} label="Search engine visibility" />
          </label>
          {!f.searchIndexing && <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">Your whole site will be hidden from search engines.</p>}
          <Field label="Title suffix" htmlFor="seo-suffix" error={errors.titleSuffix} hint={`Appended to post titles, e.g. “My post${f.titleSuffix}”.`}>
            <Input id="seo-suffix" value={f.titleSuffix} maxLength={60} onChange={(e) => setF({ ...f, titleSuffix: e.target.value })} />
          </Field>
          <Field label="Default meta description" htmlFor="seo-default-desc" error={errors.defaultMetaDescription} hint="Used on the blog home page.">
            <Textarea id="seo-default-desc" value={f.defaultMetaDescription} maxLength={320} rows={3} onChange={(e) => setF({ ...f, defaultMetaDescription: e.target.value })} />
          </Field>
          <div className="space-y-1 text-sm">
            <a href="/sitemap.xml" target="_blank" className="flex items-center gap-1.5 text-primary hover:underline"><ExternalLink className="size-3.5" />View sitemap.xml</a>
            <a href="/robots.txt" target="_blank" className="flex items-center gap-1.5 text-primary hover:underline"><ExternalLink className="size-3.5" />View robots.txt</a>
            <p className="text-xs text-muted">Submit {siteUrl}/sitemap.xml to Google Search Console.</p>
          </div>
          <Button type="submit" className="w-full" loading={saving} disabled={!dirty}>Save SEO settings</Button>
        </CardBody>
      </form>
    </Card>
  );
}
