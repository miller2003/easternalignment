/**
 * siteStats.ts — Single source of truth for site-wide content counts.
 *
 * Every count (reader profiles per platform, totals, average profile rating)
 * is computed from the content collections at build time. Pages must never
 * hand-write these numbers — import from here so stats can never drift apart
 * between homepage, hubs, comparisons and coupons.
 *
 * Platform attribution is derived from the FOLDER under content/readers/
 * (kasamba | purple-garden | keen) — same convention as the platform hub
 * routes. Frontmatter `platform:` is inconsistently present and is NOT used.
 *
 * Server-side only (import.meta.glob). Do not import from client scripts.
 */
const readerModules = import.meta.glob('../content/readers/**/*.md', { eager: true }) as Record<string, any>;

type PlatformStat = { count: number; sum: number; rated: number };

const perPlatform: Record<string, PlatformStat> = {};
for (const [filePath, mod] of Object.entries(readerModules)) {
  const p = /readers\/([a-z-]+)\//.exec(filePath)?.[1];
  if (!p) continue;
  perPlatform[p] ??= { count: 0, sum: 0, rated: 0 };
  perPlatform[p].count += 1;
  const r = Number(mod.frontmatter?.rating);
  if (Number.isFinite(r) && r > 0) {
    perPlatform[p].sum += r;
    perPlatform[p].rated += 1;
  }
}

export const siteStats = {
  /** Total reader profiles across all platforms. */
  total: Object.values(perPlatform).reduce((s, v) => s + v.count, 0),
  /** Reader profile count for one platform folder key ('kasamba' | 'purple-garden' | 'keen'). */
  count: (p: string): number => perPlatform[p]?.count ?? 0,
  /** Mean of published profile ratings for one platform, rounded to 2dp. */
  avgRating: (p: string): number | undefined => {
    const v = perPlatform[p];
    return v && v.rated > 0 ? Number((v.sum / v.rated).toFixed(2)) : undefined;
  },
};
