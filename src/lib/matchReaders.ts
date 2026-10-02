/**
 * matchReaders.ts — the minified advisor catalogue the Reader Match quiz runs on.
 *
 * Single definition shared by:
 *   · components/ReaderMatch.astro      → needs only the COUNT at build time
 *   · pages/data/match-readers.json.ts  → serves the full catalogue as a static file
 *
 * 2026-10-02: the catalogue used to be inlined into the HTML of every page that
 * mounts the quiz (/ and /match/) as a 363 KB <script type="application/json">.
 * That pushed both pages past the 150 KB cap of the edge Markdown-for-Agents
 * converter (functions/_middleware.js), so AI agents asking for Markdown got the
 * raw HTML instead — and every human visitor downloaded the data whether or not
 * they opened the quiz. It is now a separate cacheable file the quiz fetches on
 * demand (see initMatchApp in match/ui/quizApp.ts).
 */
import readersData from '../data/readers.json';

// Drops lengthy editorial bodies, keeps 100% of the matching attributes.
export const clientReaders = (readersData as any[]).map((r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  platform: r.platform,
  platformName: r.platformName,
  reviewUrl: r.reviewUrl,
  affiliateUrl: r.affiliateUrl,
  avatarUrl: r.avatarUrl,
  rating: r.rating,
  reviewRating: r.reviewRating,
  reviewCount: r.reviewCount,
  pricing: r.pricing,
  pricePerMinute: r.pricePerMinute,
  freeOffer: r.freeOffer,
  bestFor: r.bestFor,
  // Only the lead highlight (a track-record fact) — the quiz quotes it as
  // the reader-specific "From our review" line.
  highlights: (r.highlights || []).slice(0, 1),
  practices: r.practices,
  primaryPractice: r.primaryPractice,
  intents: r.intents,
  questionTypes: r.questionTypes,
  formats: r.formats,
  styles: r.styles,
  fitVector: r.fitVector,
  trust: r.trust,
  availability: r.availability,
  active: r.active,
  // NOTE: `pros`/`cons` are internal editorial audit notes (used on review
  // pages). They must NOT ship to the client payload — the quiz engine renders
  // user-safe generated copy instead (see match/engine/explanations.ts).
}));

export const MATCH_READERS_URL = '/data/match-readers.json';
