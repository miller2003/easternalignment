/**
 * relatedReaders.ts — Fair, topically-aware cross-linking for reader-review pages.
 *
 * Why this exists (the "44 articles added at once" regression):
 *   With ~158 reader reviews whose ratings cluster between 4.4 and 5.0, a naive
 *   "top N by rating" selector collapses — the same 3–4 highest-rated readers
 *   hoard nearly all internal link equity while 90%+ of pages (every newly-added
 *   batch included) receive ZERO links from the cross-link section. Purple
 *   Garden's old "first 3 in file order" selector was even worse: articles
 *   added last never appeared at all.
 *
 * The fix — a rotated-window selector over a STABLE slug-sorted list:
 *   - Window start for page i = (i * STEP) % n, with STEP coprime to every
 *     platform's n (63 / 46 / 49). The window therefore visits every residue
 *     exactly once → GUARANTEED uniform inbound links (no orphans) and balanced
 *     link equity, regardless of rating or publish order.
 *   - Within each window the picks are re-ordered by niche overlap, so the most
 *     topically-related readers surface first (topic-cluster signal for SEO)
 *     while all `count` links still emit (crawl coverage + equity preserved).
 */

export interface RelatedReader {
  slug: string;
  rating?: number;
  entities?: string[];
  bestFor?: string;
  platformName?: string;
  [key: string]: any;
}

export interface RelatedGuide {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  [key: string]: any;
}

// Specific topical niches ONLY. "psychic / intuitive / clairvoyant" are
// intentionally excluded — they match ~every reader and would neuter the
// discriminator, recreating the rating-collapse problem under a different name.
const NICHE_KEYWORDS: Record<string, string[]> = {
  love: ['love', 'relationship', 'twin', 'soulmate', 'ex-', 'romance', 'heart', 'reunion'],
  tarot: ['tarot', 'cards', 'cartomancy'],
  medium: ['medium', 'spirit', 'passed', 'channel', 'loss'],
  career: ['career', 'money', 'finance', 'business', 'job'],
  astrology: ['astrology', 'zodiac', 'horoscope', 'birth chart'],
  dream: ['dream'],
  pet: ['pet', 'animal'],
};

function readerNicheText(r: RelatedReader): string {
  return [...(r.entities ?? []), r.bestFor ?? '', r.platformName ?? ''].join(' ').toLowerCase();
}

function nichesOf(text: string): Set<string> {
  const t = text.toLowerCase();
  const out = new Set<string>();
  for (const [niche, keys] of Object.entries(NICHE_KEYWORDS)) {
    if (keys.some((k) => t.includes(k))) out.add(niche);
  }
  return out;
}

export function nicheOverlap(a: RelatedReader, b: RelatedReader): number {
  const na = nichesOf(readerNicheText(a));
  const nb = nichesOf(readerNicheText(b));
  let n = 0;
  for (const x of na) if (nb.has(x)) n++;
  return n;
}

function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Pick `count` related readers for a reader-review page using the rotated-window
 * selector described above. `all` must include the current reader. Returns
 * `count` readers (never the current one) ordered by topical relevance.
 */
export function pickRelatedReaders(
  current: RelatedReader,
  all: RelatedReader[],
  count = 4,
): RelatedReader[] {
  if (all.length <= 1) return [];
  const base = [...all].sort((a, b) => a.slug.localeCompare(b.slug));
  const n = base.length;
  const i = base.findIndex((r) => r.slug === current.slug);
  if (i < 0) return [];

  // STEP coprime to n guarantees the window start visits every residue once.
  let step = 5;
  while (gcd(step, n) !== 1) step += 2;

  const start = (i * step) % n;
  // window of count+1 so we can drop `current` and still keep `count` picks
  const window = [...base.slice(start), ...base.slice(0, start)].slice(0, count + 1);
  const picks = window.filter((r) => r.slug !== current.slug).slice(0, count);
  // Re-order by topical relevance for display (all links still emit)
  return picks.sort((a, b) => nicheOverlap(current, b) - nicheOverlap(current, a));
}

/* ────────────────────────────────────────────────────────────────────────
 * Guide→Guide cross-linking (added 2026-08-28).
 *
 * The old guides/[slug].astro dumped ALL 85 other guides + every review +
 * every comparison into the related grid (92 cards/page, alphabetical).
 * That is a footer-style boilerplate link block: near-zero equity per link,
 * zero topical signal, and it makes a pet-psychic article link to angel-
 * numbers content. Google discounts such blocks.
 *
 * The selector below is TOPIC-FIRST with a rotated window inside the topic
 * cluster, so (a) every emitted link is intent-matched, (b) link equity is
 * still spread evenly across cluster siblings over the whole page set, and
 * (c) cross-cluster fallback keeps every page emitting `count` links.
 * ──────────────────────────────────────────────────────────────────────── */

export interface GuideLike {
  slug: string;
  title?: string;
  category?: string;
  platform?: string;
  affiliateUrl?: string;
  description?: string;
  [key: string]: any;
}

/** Topic clusters for guide articles. Multi-membership is allowed and
 *  intended (e.g. "dreaming about an ex" ∈ dream ∩ love). */
const GUIDE_CLUSTER_KEYWORDS: Record<string, string[]> = {
  love: ['love', 'relationship', 'twin', 'soulmate', 'ex-', 'breakup', 'divorce', 'no-contact', 'marri', 'romance', 'reconcil', 'heart', 'dating', 'lgbtq', 'age-gap', 'long-distance', 'does-he', 'is-he', 'karmic', 'specific-person', 'coming-back', 'avoidant', 'triangle', 'situationship', 'jealousy', 'third-party', 'other-woman', 'single-parent', 'propose', 'win-her', 'win-him', 'crush', 'soul-tie', 'pregnancy', 'ldr-', '-ldr'],
  medium: ['medium', 'passed', 'deceased', 'grief', 'loss', 'evidential', 'loved-one'],
  tarot: ['tarot', 'cards'],
  career: ['career', 'money', 'finance', 'job', 'business'],
  astrology: ['astrology', 'zodiac', 'horoscope', 'birth-chart'],
  dream: ['dream'],
  spirituality: ['angel', 'aura', 'clair', 'palm', 'past-life', 'spiritual', 'am-i-psychic', 'intuition', 'empath', 'healing', 'energy', 'pet', 'animal'],
  gettingStarted: ['first-', 'how-to', 'cost', 'prepare', 'choose', 'fake', 'free-psychic', 'how-often', 'anxiety', 'beginner', 'hotline', 'are-psychics-real', 'prediction', 'legit', 'online-truth', 'what-is', 'accurate', 'honest', 'therapy', 'journeys', 'credit', 'free-minutes'],
};

function guideTopicText(g: GuideLike): string {
  return [g.slug, g.title ?? '', g.category ?? ''].join(' ').toLowerCase();
}

/** The set of topic clusters a guide belongs to (may be empty). */
export function guideClusters(g: GuideLike): Set<string> {
  const t = guideTopicText(g);
  const out = new Set<string>();
  for (const [cluster, keys] of Object.entries(GUIDE_CLUSTER_KEYWORDS)) {
    if (keys.some((k) => t.includes(k))) out.add(cluster);
  }
  return out;
}

/** 'cross-platform' roundups cover all three platforms — the value carries no
 *  platform intent, so it must NOT trigger the same-platform bonus. */
function realPlatform(p?: string): string | null {
  return p && p !== 'cross-platform' ? p : null;
}

/** Some guides lack the `platform` frontmatter field but name the platform in
 *  the slug (e.g. purple-garden-30-credit-guide) — recover it from the slug. */
function platformOf(g: GuideLike): string | null {
  const p = realPlatform(g.platform);
  if (p) return p;
  const s = g.slug.toLowerCase();
  if (s.includes('purple-garden')) return 'purple-garden';
  if (s.includes('kasamba')) return 'kasamba';
  if (/(^|-)keen(-|$)/.test(s)) return 'keen';
  return null;
}

function clusterOverlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const c of b) if (a.has(c)) n++;
  return n;
}

function samePlatform(current: GuideLike, g: GuideLike): boolean {
  const p = platformOf(current);
  return !!p && p === platformOf(g);
}

function crossFunnel(current: GuideLike, g: GuideLike): boolean {
  return Boolean(g.affiliateUrl) !== Boolean(current.affiliateUrl);
}

/** Display score: shared clusters dominate; same-platform and cross-funnel
 *  (info↔money) only refine ordering WITHIN the admitted candidate set.
 *  Cross-funnel alone is NOT an admission ticket — otherwise every money page
 *  becomes "related" to every info page and topical matching collapses. */
function guideScore(current: GuideLike, curClusters: Set<string>, g: GuideLike): number {
  let score = 4 * clusterOverlap(curClusters, guideClusters(g));
  if (samePlatform(current, g)) score += 2;
  if (crossFunnel(current, g)) score += 1;
  return score;
}

/** Deterministic rotated window over a slug-sorted list (same coprime-step
 *  principle as pickRelatedReaders): start = (i * step) % n with step coprime
 *  to n, so windows sweep all residues across the page set. */
function rotatedWindow<T extends { slug: string }>(list: T[], i: number, count: number): T[] {
  if (list.length <= count) return list;
  const n = list.length;
  let step = 5;
  while (gcd(step, n) !== 1) step += 2;
  const start = (i * step) % n;
  return [...list.slice(start), ...list.slice(0, start)].slice(0, count);
}

/**
 * Pick `count` intent-matched related guides for a guide page.
 * - Admission: a candidate must share a topic cluster OR the same platform.
 * - RAREST-cluster-first: a page always links every sibling of its smallest
 *   cluster (e.g. mediumship's 3 pages always interlink), so small clusters
 *   can never be starved by the rotation windows of large ones.
 * - Larger clusters are served by a coprime rotated window (even equity
 *   spread across the whole page set, same principle as pickRelatedReaders).
 * - If admission yields fewer than `count`, the remainder comes from a
 *   rotated window over the rest — every page always emits `count` links.
 * Returned picks are ordered by relevance score (desc) for display.
 */
export function pickRelatedGuidesForGuide(  current: GuideLike,
  allGuides: GuideLike[],
  count = 6,
): GuideLike[] {
  if (allGuides.length <= 1) return [];
  const fullSorted = [...allGuides].sort((a, b) => a.slug.localeCompare(b.slug));
  const i = fullSorted.findIndex((g) => g.slug === current.slug);
  if (i < 0) return [];

  const curClusters = guideClusters(current);

  // Site-wide cluster sizes, for rare-cluster-first ordering.
  const clusterSize = new Map<string, number>();
  for (const g of allGuides) {
    for (const c of guideClusters(g)) clusterSize.set(c, (clusterSize.get(c) ?? 0) + 1);
  }

  const others = fullSorted.filter((g) => g.slug !== current.slug);
  const admitted = others.filter(
    (g) => clusterOverlap(curClusters, guideClusters(g)) > 0 || samePlatform(current, g),
  );
  const notAdmitted = others.filter((g) => !admitted.includes(g));

  const rareCluster = [...curClusters].sort(
    (a, b) => (clusterSize.get(a) ?? 0) - (clusterSize.get(b) ?? 0) || a.localeCompare(b),
  )[0];
  const rare = rareCluster ? admitted.filter((g) => guideClusters(g).has(rareCluster)) : [];
  const rest = admitted.filter((g) => !rare.includes(g));

  const picks: GuideLike[] =
    rare.length >= count
      ? rotatedWindow(rare, i, count)
      : [...rare, ...rotatedWindow(rest, i, count - rare.length)];
  const need = count - picks.length;
  if (need > 0) picks.push(...rotatedWindow(notAdmitted, i, need));

  return picks
    .slice(0, count)
    .sort((a, b) => guideScore(current, curClusters, b) - guideScore(current, curClusters, a));
}

/* ── Hub sections (single source of truth) ───────────────────────────────
 * Used by: /guides/ hub page (section grouping), guide-page breadcrumb
 * (cluster level), and the mid-article "keep reading" card label.
 * Assignment priority matters: specialty clusters are tested BEFORE love so
 * dual-intent articles bulk up the small sections; each guide lands in
 * exactly ONE section (first match wins). */

const EX_RECOVERY_KEYS = ['ex-', 'breakup', 'divorce', 'no-contact', 'coming-back', 'dreaming-about-ex'];

export interface GuideSection {
  id: string;
  heading: string;
  intro: string;
  test: (g: GuideLike, clusters: Set<string>) => boolean;
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'breakups-ex-recovery',
    heading: 'Breakups & Ex-Recovery',
    intro: 'No-contact, reconciliation, and post-breakup clarity — the readers and strategies that specialize in ex-energy questions.',
    test: (g) => EX_RECOVERY_KEYS.some((k) => `${g.slug} ${g.title ?? ''}`.toLowerCase().includes(k)),
  },
  {
    id: 'tarot',
    heading: 'Tarot & Card Readings',
    intro: 'Card meanings, spreads, and how to choose a tarot reader for your specific question.',
    test: (_g, c) => c.has('tarot'),
  },
  {
    id: 'mediumship',
    heading: 'Mediumship & Connecting with Loved Ones',
    intro: 'Evidential mediums, grief support, and what to expect when reaching out to someone who has passed.',
    test: (_g, c) => c.has('medium'),
  },
  {
    id: 'career-money',
    heading: 'Career & Money Readings',
    intro: 'Job decisions, financial crossroads, and business timing — readers who focus on practical outcomes.',
    test: (_g, c) => c.has('career'),
  },
  {
    id: 'love',
    heading: 'Love & Relationship Readings',
    intro: 'Soulmates, twin flames, situationships, and every relationship question in between — our largest collection.',
    test: (_g, c) => c.has('love'),
  },
  {
    id: 'spirituality',
    heading: 'Spirituality & Energy Work',
    intro: 'Angel numbers, auras, the clairs, past lives, and animal communication — the spiritual fundamentals.',
    test: (_g, c) => c.has('spirituality'),
  },
  {
    id: 'getting-started',
    heading: 'Getting Started',
    intro: 'Costs, preparation, red flags, and platform offers — everything to know before your first reading.',
    test: (_g, c) => c.has('gettingStarted'),
  },
  {
    id: 'more-guides',
    heading: 'More Guides',
    intro: 'Platform deep-dives and everything else worth reading.',
    test: () => true,
  },
];

/** The single hub section a guide belongs to (first matching section wins). */
export function guideSection(g: GuideLike): GuideSection {
  const c = guideClusters(g);
  return GUIDE_SECTIONS.find((s) => s.test(g, c)) ?? GUIDE_SECTIONS[GUIDE_SECTIONS.length - 1];
}

/**
 * Pick the ONE guide promoted mid-article ("Keep reading" card) on a guide
 * page. Funnel rule: promote a COMMERCIAL page (affiliateUrl set) from the
 * admitted set — info traffic should flow to money pages; on money pages the
 * card promotes a commercial sibling. Rotation over the commercial candidates
 * spreads the mid-article equity instead of piling every page's card onto the
 * same top roundup. Falls back to the top-scoring admitted guide when a
 * cluster has no commercial page, and to null when nothing is admitted (the
 * caller then skips rendering).
 */
export function pickMidArticleGuide(current: GuideLike, allGuides: GuideLike[]): GuideLike | null {
  if (allGuides.length <= 1) return null;
  const fullSorted = [...allGuides].sort((a, b) => a.slug.localeCompare(b.slug));
  const i = fullSorted.findIndex((g) => g.slug === current.slug);
  if (i < 0) return null;
  const curClusters = guideClusters(current);

  const admitted = fullSorted.filter(
    (g) =>
      g.slug !== current.slug &&
      (clusterOverlap(curClusters, guideClusters(g)) > 0 || samePlatform(current, g)),
  );
  if (admitted.length === 0) return null;

  const commercial = admitted.filter((g) => Boolean(g.affiliateUrl));
  if (commercial.length > 0) return rotatedWindow(commercial, i, 1)[0];

  return admitted.sort(
    (a, b) => guideScore(current, curClusters, b) - guideScore(current, curClusters, a),
  )[0];
}

/**
 * Reader-page guide picker. Returns up to `max` guides ordered as
 * [flow, ...grid]: index 0 is the single most relevant guide (feeds the
 * InfiniteContentFlow "continue reading" article), the rest are a ROTATED
 * window over the remaining relevant candidates (bottom grid) so link equity
 * spreads across all relevant guides instead of the same 3–4 roundups
 * hoarding every reader page (the 2026-08-27 lesson, applied 2026-08-28).
 *
 * Scoring: niche-keyword overlap (slug/title weighted) + same-platform bonus
 * (`platform` param) so every reader page surfaces its own platform's money
 * roundups — closing the reader→roundup→reader conversion loop. Niche-less
 * readers with a `platform` still get that platform's guides (score 3), never
 * a blind alphabetical fallback.
 *
 * `seed`: caller passes the reader's index in its platform's slug-sorted
 * reader list — drives the coprime rotation (deterministic per page).
 */
export function pickRelatedGuides(
  reader: RelatedReader,
  guides: RelatedGuide[],
  max = 4,
  platform?: string,
  seed = 0,
): RelatedGuide[] {
  if (guides.length === 0) return [];
  const rNiche = nichesOf(readerNicheText(reader));
  const scored = guides.map((g) => {
    const slug = g.slug.toLowerCase();
    const title = (g.title ?? '').toLowerCase();
    const blob = [slug, title, g.description ?? '', g.category ?? ''].join(' ').toLowerCase();
    let score = 0;
    for (const n of rNiche) {
      if (slug.includes(n) || title.includes(n)) score += 2;
      else if (blob.includes(n)) score += 1;
    }
    if (platform && platformOf(g as GuideLike) === platform) score += 3;
    return { g, score };
  });

  const candidates = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.g.slug.localeCompare(b.g.slug));

  if (candidates.length === 0) {
    return [...guides].sort((a, b) => a.slug.localeCompare(b.slug)).slice(0, max);
  }

  const flow = candidates[0].g;
  const pool = candidates.slice(1).map((s) => s.g);
  return [flow, ...rotatedWindow(pool, seed, max - 1)];
}
