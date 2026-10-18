import { countWords, stripHtml } from "./utils";

export type SeoInput = {
  title: string;
  slug: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  excerpt?: string | null;
  hasFeaturedImage: boolean;
};

export type SeoCheck = { id: string; label: string; passed: boolean; weight: number; hint: string };

export const META_TITLE_RANGE = [30, 60] as const;
export const META_DESC_RANGE = [120, 160] as const;

export function effectiveMetaDescription(input: Pick<SeoInput, "metaDescription" | "excerpt" | "content">) {
  if (input.metaDescription?.trim()) return input.metaDescription.trim();
  if (input.excerpt?.trim()) return input.excerpt.trim();
  return stripHtml(input.content).slice(0, 160);
}

/** Deterministic, explainable SEO score (0–100) used in the editor and stored on save. */
export function analyzeSeo(input: SeoInput): { score: number; checks: SeoCheck[] } {
  const kw = input.focusKeyword?.trim().toLowerCase() ?? "";
  const text = stripHtml(input.content);
  const lower = text.toLowerCase();
  const words = countWords(text);
  const metaTitle = (input.metaTitle?.trim() || input.title.trim());
  const metaDesc = input.metaDescription?.trim() ?? "";
  const firstChunk = lower.split(/\s+/).slice(0, 120).join(" ");
  const kwSlug = kw.replace(/\s+/g, "-");
  const imgs = input.content.match(/<img\b[^>]*>/gi) ?? [];
  const imgsMissingAlt = imgs.filter((t) => !/\balt="[^"]+"/i.test(t)).length;

  const checks: SeoCheck[] = [
    { id: "kw", label: "Focus keyword is set", passed: !!kw, weight: 10, hint: "Choose the main phrase this post should rank for." },
    { id: "kw-title", label: "Keyword appears in SEO title", passed: !!kw && metaTitle.toLowerCase().includes(kw), weight: 10, hint: "Include the focus keyword in the title, ideally near the start." },
    { id: "kw-desc", label: "Keyword appears in meta description", passed: !!kw && metaDesc.toLowerCase().includes(kw), weight: 8, hint: "Mention the focus keyword in the meta description." },
    { id: "kw-slug", label: "Keyword appears in URL slug", passed: !!kw && input.slug.includes(kwSlug), weight: 8, hint: "Add the keyword to the slug." },
    { id: "kw-intro", label: "Keyword appears in the introduction", passed: !!kw && firstChunk.includes(kw), weight: 8, hint: "Use the keyword in the first paragraph." },
    { id: "title-len", label: `SEO title is ${META_TITLE_RANGE[0]}–${META_TITLE_RANGE[1]} characters`, passed: metaTitle.length >= META_TITLE_RANGE[0] && metaTitle.length <= META_TITLE_RANGE[1], weight: 10, hint: `Currently ${metaTitle.length} characters.` },
    { id: "desc-len", label: `Meta description is ${META_DESC_RANGE[0]}–${META_DESC_RANGE[1]} characters`, passed: metaDesc.length >= META_DESC_RANGE[0] && metaDesc.length <= META_DESC_RANGE[1], weight: 10, hint: metaDesc ? `Currently ${metaDesc.length} characters.` : "No meta description written yet." },
    { id: "length", label: "Content has at least 300 words", passed: words >= 300, weight: 10, hint: `Currently ${words} words.` },
    { id: "headings", label: "Content uses subheadings", passed: /<h[2-4]\b/i.test(input.content), weight: 6, hint: "Break the content up with H2/H3 headings." },
    { id: "links", label: "Content contains links", passed: /<a\b[^>]*href=/i.test(input.content), weight: 6, hint: "Link to related posts or sources." },
    { id: "featured", label: "Featured image is set", passed: input.hasFeaturedImage, weight: 7, hint: "Add a featured image for social sharing and listings." },
    { id: "alt", label: "All images have alt text", passed: imgsMissingAlt === 0, weight: 4, hint: `${imgsMissingAlt} image(s) missing alt text.` },
    { id: "slug-len", label: "URL slug is concise (≤ 75 chars)", passed: input.slug.length > 0 && input.slug.length <= 75, weight: 3, hint: `Currently ${input.slug.length} characters.` },
  ];
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  return { score: Math.round((got / total) * 100), checks };
}

export function seoTone(score: number) {
  if (score >= 80) return { label: "Good", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" };
  if (score >= 50) return { label: "Needs work", className: "bg-amber-50 text-amber-700 ring-amber-600/20" };
  return { label: "Poor", className: "bg-red-50 text-red-700 ring-red-600/20" };
}
