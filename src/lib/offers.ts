/**
 * offers.ts — Single source of truth for per-platform affiliate offer copy.
 *
 * Every CTA surface (DealStrip, InlineCta, SidebarDealCard, ScorePanel,
 * StickyCTA, EndCTA, TopOfferBar) reads from this map so offer wording
 * stays consistent and truthful across the whole site. If a platform
 * changes its intro deal, update it HERE once.
 *
 * Copy rules (hard constraints):
 *  - Never invent numbers. Offer text mirrors what the platform actually
 *    advertises to new clients (same claims already used in EndCTA /
 *    LeftSidebar / platform frontmatter).
 *  - No fabricated social proof ("19,897 people visited last week").
 *    Proof points must be verifiable from our own content (e.g. number of
 *    advisor reviews we have published).
 *  - Every link routes through /go/<goSlug>/ so the PostHog gating +
 *    click attribution in PostHog.astro keeps working.
 */

export type { PlatformKey } from './platform';
import type { PlatformKey } from './platform';

export interface PlatformOffer {
  /** Platform key used across components. */
  key: PlatformKey;
  /** Display name. */
  name: string;
  /** /go/ slug (note: Purple Garden's slug has no dash). */
  goSlug: string;
  /** Short offer phrase, e.g. "5 minutes for $1". */
  offer: string;
  /** Deal-strip sentence with emphasis markers, e.g. for the banner. */
  dealLine: string;
  /** Primary button label (with arrow). */
  ctaLabel: string;
  /** Risk-reversal micro line rendered under buttons. */
  microLine: string;
  /** Brand accent colour used for the platform name / logo text. */
  color: string;
  /** Domain used for the favicon/logo (Google s2 service, same as sidebars). */
  faviconDomain: string;
  /** Real number of individual advisor reviews published on this site. */
  reviewedCount: number;
  /** Top promo bar line (gift icon + this text). */
  topBarLine: string;
}

export const PLATFORM_OFFERS: Record<PlatformKey, PlatformOffer> = {
  keen: {
    key: 'keen',
    name: 'Keen',
    goSlug: 'keen',
    offer: '5 minutes for $1',
    dealLine: 'New-client offer: your first 5 minutes for just $1 — applied to your first purchase.',
    ctaLabel: 'Claim 5 Minutes for $1 →',
    microLine: 'Free to join · Offer applied at checkout · No subscription',
    color: '#004d40',
    faviconDomain: 'keen.com',
    reviewedCount: 49,
    topBarLine: 'Keen Special Offer — your first 5 minutes for just $1 (new clients)',
  },
  kasamba: {
    key: 'kasamba',
    name: 'Kasamba',
    goSlug: 'kasamba',
    offer: '3 free minutes + 50% off',
    dealLine: 'New-client offer: 3 FREE minutes with every new advisor + 50% OFF your first session.',
    ctaLabel: 'Claim 3 Free Minutes →',
    microLine: 'Free to join · 3 free minutes with each new advisor · No subscription',
    color: '#4a6ee0',
    faviconDomain: 'kasamba.com',
    reviewedCount: 35,
    topBarLine: 'Kasamba Special Offer — 3 FREE minutes + 50% OFF your first session',
  },
  'purple-garden': {
    key: 'purple-garden',
    name: 'Purple Garden',
    goSlug: 'purplegarden',
    offer: '$30 free credit',
    dealLine: 'New-client offer: $30 in FREE credit toward your first reading.',
    ctaLabel: 'Claim $30 Free Credit →',
    microLine: 'Free to join · Credit applied to your first reading · No subscription',
    color: '#6b4d8c',
    faviconDomain: 'purplegarden.co',
    reviewedCount: 30,
    topBarLine: 'Purple Garden Special Offer — $30 in FREE credit for new clients',
  },
};

/**
 * Canonical site-wide DEFAULT recommendation order (2026-08-25 priority reset).
 *
 * Kasamba leads, Purple Garden is No.2, Keen is No.3. Every CTA surface that
 * has NO page-specific platform context should derive its order/fallback from
 * this array so the site presents one consistent default ranking — instead of
 * the old behaviour where "Keen" was hard-coded as the implicit No.1 in several
 * components. Page-specific contexts (a Kasamba reader page, a comparison whose
 * winner is Keen, etc.) still override this as intended.
 */
export const PLATFORM_PRIORITY: PlatformKey[] = ['kasamba', 'purple-garden', 'keen'];

/** Full /go/ path for a platform (generic platform-level deeplink). */
export function goPath(key: PlatformKey): string {
  return `/go/${PLATFORM_OFFERS[key].goSlug}/`;
}

/**
 * Honest hover-proof line for the CTA tooltip — mysticmag's hover
 * social-proof technique, rebuilt with our real numbers (never fabricated
 * "visitors last week" counts).
 */
export function proofTooltip(key: PlatformKey): string {
  const o = PLATFORM_OFFERS[key];
  return `${o.reviewedCount} ${o.name} advisors individually reviewed on this site — with real paid sessions.`;
}

/** Favicon/logo URL for a platform (same Google s2 service the sidebars use). */
export function platformLogo(key: PlatformKey, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${PLATFORM_OFFERS[key].faviconDomain}&sz=${size}`;
}
