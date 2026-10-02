/**
 * auditStats.ts — original, citable numbers computed from our own advisor audits.
 *
 * This is the "information gain" layer: figures no other site can quote because
 * they come from our own profile-by-profile audit. Computed at build time from
 * the content collections, so a number can never be hand-written and drift.
 * Used by:
 *   · the homepage "What our audits show" section (+ Dataset JSON-LD)
 *   · /guides/ FAQ answers
 *   · pages/data/psychic-platform-audit.json.ts (the machine-readable copy)
 *
 * Definitions (keep in step with the on-page copy):
 *   · "listed rate"  = the lowest per-minute rate shown on an advisor's profile
 *                      (the first $ figure in the profile `pricing` field)
 *   · "audit score"  = our editorial 1–5 score for that advisor (profile `rating`)
 *   · platform price range / welcome offer come from each platform review
 *
 * Server-side only (import.meta.glob).
 */
import { PLATFORM_OFFERS, PLATFORM_PRIORITY, type PlatformKey } from './offers';

const readerModules = import.meta.glob('../content/readers/**/*.md', { eager: true }) as Record<string, any>;
const reviewModules = import.meta.glob('../content/reviews/*.md', { eager: true }) as Record<string, any>;

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const percentile = (xs: number[], p: number): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(p * (s.length - 1))];
};
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const isoDay = (d: unknown) => (d ? new Date(d as any).toISOString().slice(0, 10) : '');

export interface AdvisorRow {
  slug: string;
  name: string;
  platform: PlatformKey;
  listedRate: number | null;
  auditScore: number | null;
  url: string;
}

const advisors: AdvisorRow[] = [];
let latestAdvisorUpdate = '';
for (const [filePath, mod] of Object.entries(readerModules)) {
  const platform = /readers\/([a-z-]+)\//.exec(filePath)?.[1] as PlatformKey | undefined;
  if (!platform || !(platform in PLATFORM_OFFERS)) continue;
  const fm = mod.frontmatter ?? {};
  const slug = filePath.split('/').pop()!.replace('.md', '');
  const rate = Number(/\$(\d+(?:\.\d+)?)/.exec(String(fm.pricing ?? ''))?.[1]);
  const score = Number(fm.rating);
  const name = String(fm.platformName ?? slug).split(':').slice(1).join(':').trim() || slug;
  advisors.push({
    slug,
    name,
    platform,
    listedRate: Number.isFinite(rate) && rate > 0 ? rate : null,
    auditScore: Number.isFinite(score) && score > 0 ? score : null,
    url: `https://easternalignment.com/reviews/${platform}/${slug}/`,
  });
  const d = isoDay(fm.updatedDate || fm.publishDate);
  if (d > latestAdvisorUpdate) latestAdvisorUpdate = d;
}
advisors.sort((a, b) => a.platform.localeCompare(b.platform) || a.slug.localeCompare(b.slug));

const reviewFM: Record<string, any> = {};
for (const [p, mod] of Object.entries(reviewModules)) {
  reviewFM[p.split('/').pop()!.replace('.md', '')] = mod.frontmatter ?? {};
}

const summarise = (rows: AdvisorRow[]) => {
  const rates = rows.map((r) => r.listedRate).filter((n): n is number => n != null);
  const scores = rows.map((r) => r.auditScore).filter((n): n is number => n != null);
  return {
    profiles: rows.length,
    medianListedRate: round2(median(rates)),
    lowestListedRate: rates.length ? Math.min(...rates) : 0,
    highestListedRate: rates.length ? Math.max(...rates) : 0,
    shareAtOrUnder5PerMin: pct(rates.filter((r) => r <= 5).length, rates.length),
    averageAuditScore: scores.length ? round2(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    /** 80% of audited advisors score between these two values. */
    auditScoreP10: percentile(scores, 0.1),
    auditScoreP90: percentile(scores, 0.9),
  };
};

export const lastReviewUpdate: string = Object.values(reviewFM)
  .map((fm) => isoDay(fm.updatedDate || fm.publishDate))
  .sort()
  .pop() ?? '';

export const auditStats = {
  overall: summarise(advisors),
  platforms: PLATFORM_PRIORITY.map((key) => {
    const fm = reviewFM[key] ?? {};
    return {
      key,
      name: PLATFORM_OFFERS[key].name,
      welcomeOffer: PLATFORM_OFFERS[key].offer,
      platformPriceRange: String(fm.pricing ?? ''),
      platformScore: Number(fm.rating) || null,
      reviewUrl: `https://easternalignment.com/reviews/${key}/`,
      ...summarise(advisors.filter((a) => a.platform === key)),
    };
  }),
  advisors,
  /** Latest date anything in the audit was edited (advisor profiles or platform reviews). */
  lastUpdated: [latestAdvisorUpdate, lastReviewUpdate].sort().pop() ?? '',
};

export type AuditStats = typeof auditStats;
