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

/**
 * Self-hosted brand icon path for a platform.
 *
 * 2026-08-26 migration: switched from Google's `s2/favicons` service to
 * locally-hosted official app icons (256×256 PNG, pulled from each
 * platform's iOS App Store listing). Why the change was necessary:
 *   - google.com is unreachable for part of the audience (easternalignment's
 *     owner QA included), which rendered every CTA icon as a blank white
 *     chip on those visits — a silent conversion killer.
 *   - s2/favicons returned a 16×16 ICO upscaled to 24–128px display slots,
 *     visibly blurry against the card chrome.
 *   - hotlinking google leaked visitor IPs to a third party (GDPR risk),
 *     and the service has no SLA — a single Google outage blanks every
 *     brand mark site-wide.
 *
 * The `size` parameter is preserved for backward compatibility with
 * existing callers (EndCTA/StickyCTA/ScorePanel/etc. pass 64 or 128);
 * a single 256px master serves every slot, including retina @128px.
 *
 * Assets live in /public/logos/ and are served by Cloudflare's CDN —
 * one round-trip, immutable, cacheable for a year via filename hashing
 * when future revisions land.
 */
export function platformLogo(key: PlatformKey, _size = 64): string {
  return `/logos/${key}.png`;
}
