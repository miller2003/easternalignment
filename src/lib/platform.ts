/**
 * Single source of truth for resolving a reader/platform display name to the
 * canonical platform key used across the site (affiliate routing, CTAs, nudge
 * copy buckets, sticky CTA config, schema brand field, etc.).
 *
 * Why centralised: the same name-parsing logic was previously duplicated in
 * ReviewLayout.astro. Any new caller (e.g. ReaderEndCTA) needs the SAME answer
 * for the SAME input — otherwise a Keen reader could pick a Kasamba bucket.
 *
 * Returned union is exhaustive; null means "not one of our 3 platforms" and
 * callers should decide their own fallback (we always default to 'keen' as the
 * safest most-common case at the call site, never here).
 */
export type PlatformKey = 'keen' | 'kasamba' | 'purple-garden';

export function platformFromName(name: string | null | undefined): PlatformKey | null {
  const lower = (name || '').toLowerCase();
  if (lower.includes('kasamba')) return 'kasamba';
  if (lower.includes('purple'))  return 'purple-garden';
  if (lower.includes('keen'))    return 'keen';
  return null;
}
