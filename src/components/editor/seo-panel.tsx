"use client";
import * as React from "react";
import { CheckCircle2, ChevronDown, Circle, ImageIcon, X } from "lucide-react";
import { analyzeSeo, effectiveMetaDescription, META_DESC_RANGE, META_TITLE_RANGE, seoTone } from "@/lib/seo";
import type { MediaItem } from "@/actions/media";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Switch, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type SeoState = {
  metaTitle: string; metaDescription: string; focusKeyword: string; canonicalUrl: string; noIndex: boolean; noFollow: boolean; ogImage: MediaItem | null;
};

function Counter({ n, range }: { n: number; range: readonly [number, number] }) {
  const ok = n >= range[0] && n <= range[1];
  return <span className={cn("text-xs tabular-nums", n === 0 ? "text-muted" : ok ? "text-emerald-700" : "text-amber-700")}>{n} / {range[1]}</span>;
}

export function SeoPanel({ seo, onChange, title, slug, content, excerpt, featuredImage, siteUrl, titleSuffix, errors, onPickOgImage }: {
  seo: SeoState; onChange: (patch: Partial<SeoState>) => void; title: string; slug: string; content: string; excerpt: string;
  featuredImage: MediaItem | null; siteUrl: string; titleSuffix: string; errors: Record<string, string>; onPickOgImage: () => void;
}) {
  const [showChecks, setShowChecks] = React.useState(false);
  const deferredContent = React.useDeferredValue(content);
  const { score, checks } = React.useMemo(
    () => analyzeSeo({ title, slug, content: deferredContent, metaTitle: seo.metaTitle, metaDescription: seo.metaDescription, focusKeyword: seo.focusKeyword, excerpt, hasFeaturedImage: !!featuredImage }),
    [title, slug, deferredContent, seo.metaTitle, seo.metaDescription, seo.focusKeyword, excerpt, featuredImage],
  );
  const tone = seoTone(score);
  const serpTitle = `${seo.metaTitle || title || "Untitled post"}${seo.metaTitle ? "" : titleSuffix}`;
  const serpDesc = effectiveMetaDescription({ metaDescription: seo.metaDescription, excerpt, content: deferredContent });
  const url = `${siteUrl.replace(/^https?:\/\//, "")} › blog › ${slug || "your-post"}`;
  const passed = checks.filter((c) => c.passed).length;

  return (
    <Card>
      <CardHeader title="SEO settings" description="Control how this post appears in search results and social shares."
        action={<span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", tone.className)}>SEO score {score} · {tone.label}</span>} />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Search result preview</p>
          <div className="rounded-lg border border-border bg-white p-4" aria-label="Search result preview">
            <p className="truncate text-xs text-[#4d5156]">{url}</p>
            <p className="mt-1 line-clamp-1 text-lg leading-snug text-[#1a0dab]">{serpTitle}</p>
            <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{serpDesc || "Add a meta description or excerpt to control this snippet."}</p>
          </div>
          {seo.noIndex && <p className="mt-2 text-xs font-medium text-amber-700">This post is hidden from search engines (noindex).</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Focus keyword" htmlFor="seo-kw" error={errors.focusKeyword} hint="The main phrase you want this post to rank for.">
            <Input id="seo-kw" value={seo.focusKeyword} onChange={(e) => onChange({ focusKeyword: e.target.value })} placeholder="e.g. content marketing" />
          </Field>
          <Field label="Canonical URL" htmlFor="seo-canonical" error={errors.canonicalUrl} hint="Only set this if the post was first published elsewhere.">
            <Input id="seo-canonical" type="url" value={seo.canonicalUrl} onChange={(e) => onChange({ canonicalUrl: e.target.value })} placeholder={`${siteUrl}/blog/${slug || "…"}`} aria-invalid={!!errors.canonicalUrl} />
          </Field>
        </div>
        <Field label="Meta title" htmlFor="seo-title" error={errors.metaTitle} aside={<Counter n={(seo.metaTitle || title).length} range={META_TITLE_RANGE} />}
          hint={`Leave empty to use the post title. Aim for ${META_TITLE_RANGE[0]}–${META_TITLE_RANGE[1]} characters.`}>
          <Input id="seo-title" value={seo.metaTitle} onChange={(e) => onChange({ metaTitle: e.target.value })} placeholder={title || "Post title"} maxLength={120} />
        </Field>
        <Field label="Meta description" htmlFor="seo-desc" error={errors.metaDescription} aside={<Counter n={seo.metaDescription.length} range={META_DESC_RANGE} />}
          hint={`Aim for ${META_DESC_RANGE[0]}–${META_DESC_RANGE[1]} characters. Falls back to the excerpt.`}>
          <Textarea id="seo-desc" value={seo.metaDescription} onChange={(e) => onChange({ metaDescription: e.target.value })} rows={3} maxLength={320} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Open Graph image</p>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                {seo.ogImage ? <img src={seo.ogImage.url} alt="" className="size-full object-cover" />
                  : featuredImage ? <img src={featuredImage.url} alt="" className="size-full object-cover opacity-60" />
                  : <ImageIcon className="size-5 text-slate-300" />}
              </div>
              <div className="flex flex-col items-start gap-1">
                <Button variant="outline" size="sm" onClick={onPickOgImage}>{seo.ogImage ? "Change" : "Choose image"}</Button>
                {seo.ogImage ? <Button variant="link" size="sm" className="text-xs text-red-600" onClick={() => onChange({ ogImage: null })}><X className="size-3" />Remove</Button>
                  : <span className="text-xs text-muted">{featuredImage ? "Using featured image" : "Recommended 1200×630"}</span>}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Search engine indexing</p>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span><span className="font-medium">Allow search engines to index</span><span className="block text-xs text-muted">Turn off to add a noindex tag.</span></span>
              <Switch checked={!seo.noIndex} onCheckedChange={(v) => onChange({ noIndex: !v })} label="Allow indexing" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span><span className="font-medium">Allow search engines to follow links</span><span className="block text-xs text-muted">Turn off to add nofollow.</span></span>
              <Switch checked={!seo.noFollow} onCheckedChange={(v) => onChange({ noFollow: !v })} label="Allow following links" />
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-border">
          <button type="button" onClick={() => setShowChecks((s) => !s)} aria-expanded={showChecks}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
            SEO checklist · {passed}/{checks.length} passed
            <ChevronDown className={cn("size-4 transition-transform", showChecks && "rotate-180")} />
          </button>
          {showChecks && (
            <ul className="space-y-2 border-t border-border px-4 py-3">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-2.5 text-sm">
                  {c.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Passed" /> : <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" aria-label="Not yet" />}
                  <span><span className={c.passed ? "text-navy-900" : "text-navy-700"}>{c.label}</span>{!c.passed && <span className="block text-xs text-muted">{c.hint}</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
