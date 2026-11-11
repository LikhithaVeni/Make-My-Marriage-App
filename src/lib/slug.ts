// Website addresses (slugs) for weddings, e.g. "ravi-weds-sneha" (PRD,
// "Wedding website"). Shared by the Create wedding form and the server.

export const SLUG_MAX = 40;

/** "KaLi's era" → "kalis-era": lowercase letters, numbers and single hyphens. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, "");
}
