/**
 * seo.ts — shared structured-data + date helpers for hand-built pages
 * (/, /match/, /guides/ and its topic pages; /coupons/ predates this and
 * builds its own graph).
 *
 * Why a helper: every one of these pages needs the same WebPage node wired to
 * the site-wide @id graph declared in BaseLayout (#website, #organization,
 * #sarah). Writing it four times is how `dateModified` and `speakable` drift.
 *
 * Dates:
 *   · hand-edited page dates live in src/data/page-meta.json
 *   · content-derived dates (latest review / guide) are computed by the page
 *   · the sitemap <lastmod> (astro.config.mjs) reads the same two sources, so
 *     the on-page label, the schema and the sitemap cannot disagree.
 */

export const SITE = 'https://easternalignment.com';

export const IDS = {
  website: `${SITE}/#website`,
  organization: `${SITE}/#organization`,
  person: `${SITE}/#sarah`,
} as const;

/** Entity disambiguation: only topics with a stable, verified Wikipedia article. */
export const TOPIC_ENTITIES = {
  psychic: { '@type': 'Thing', name: 'Psychic', sameAs: 'https://en.wikipedia.org/wiki/Psychic' },
  tarot: { '@type': 'Thing', name: 'Tarot', sameAs: 'https://en.wikipedia.org/wiki/Tarot' },
  astrology: { '@type': 'Thing', name: 'Astrology', sameAs: 'https://en.wikipedia.org/wiki/Astrology' },
  mediumship: { '@type': 'Thing', name: 'Mediumship', sameAs: 'https://en.wikipedia.org/wiki/Spirit_medium' },
  coldReading: { '@type': 'Thing', name: 'Cold reading', sameAs: 'https://en.wikipedia.org/wiki/Cold_reading' },
} as const;

export const PLATFORM_ORGS = [
  { '@type': 'Organization', name: 'Kasamba' },
  { '@type': 'Organization', name: 'Purple Garden' },
  { '@type': 'Organization', name: 'Keen' },
];

/** Latest of several ISO dates (YYYY-MM-DD strings sort lexicographically). */
export const isoMax = (...dates: Array<string | undefined | null>): string =>
  dates.filter((d): d is string => !!d).map((d) => String(d).slice(0, 10)).sort().pop() ?? '';

export const fmtDate = (iso: string): string =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

export const fmtMonthYear = (iso: string): string =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', timeZone: 'UTC',
  });

export interface WebPageInput {
  url: string;
  name: string;
  headline?: string;
  description: string;
  /** schema.org type(s); default WebPage */
  type?: string | string[];
  datePublished?: string;
  dateModified: string;
  /** Set only when someone actually re-checked the facts on that date. */
  lastReviewed?: string;
  about?: object[];
  mentions?: object[];
  /** CSS selectors of the passages worth reading aloud / quoting verbatim. */
  speakable?: string[];
  mainEntityId?: string;
  breadcrumbId?: string;
  extra?: Record<string, unknown>;
}

export function webPageNode(i: WebPageInput) {
  return {
    '@type': i.type ?? 'WebPage',
    '@id': `${i.url}#webpage`,
    url: i.url,
    name: i.name,
    headline: i.headline ?? i.name,
    description: i.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': IDS.website },
    publisher: { '@id': IDS.organization },
    author: { '@id': IDS.person },
    reviewedBy: { '@id': IDS.person },
    ...(i.datePublished ? { datePublished: i.datePublished } : {}),
    dateModified: i.dateModified,
    ...(i.lastReviewed ? { lastReviewed: i.lastReviewed } : {}),
    ...(i.about ? { about: i.about } : {}),
    ...(i.mentions ? { mentions: i.mentions } : {}),
    ...(i.mainEntityId ? { mainEntity: { '@id': i.mainEntityId } } : {}),
    ...(i.breadcrumbId ? { breadcrumb: { '@id': i.breadcrumbId } } : {}),
    primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}/og-default.jpg` },
    ...(i.speakable?.length
      ? { speakable: { '@type': 'SpeakableSpecification', cssSelector: i.speakable } }
      : {}),
    potentialAction: { '@type': 'ReadAction', target: [i.url] },
    ...(i.extra ?? {}),
  };
}
