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

/**
 * Pick up to `max` guides whose topic overlaps the reader's niches, for the
 * "Continue Your Research" / related-content block. Relevance-first; falls back
 * to the first `max` guides when nothing matches (keeps the section populated).
 */
export function pickRelatedGuides(
  reader: RelatedReader,
  guides: RelatedGuide[],
  max = 4,
): RelatedGuide[] {
  const rNiche = nichesOf(readerNicheText(reader));
  if (rNiche.size === 0 || guides.length === 0) {
    return guides.slice(0, max);
  }
  const scored = guides.map((g) => {
    const slug = g.slug.toLowerCase();
    const title = (g.title ?? '').toLowerCase();
    const blob = [slug, title, g.description ?? '', g.category ?? ''].join(' ').toLowerCase();
    let score = 0;
    for (const n of rNiche) {
      if (slug.includes(n) || title.includes(n)) score += 2;
      else if (blob.includes(n)) score += 1;
    }
    return { g, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, max);
  return (top.length ? top : scored.slice(0, max)).map((s) => s.g);
}
