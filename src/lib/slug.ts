export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function validateSlug(slug: string): string | null {
  if (!slug) return "Slug is required.";
  if (slug.length > 120) return "Slug must be 120 characters or fewer.";
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens only.";
  return null;
}
