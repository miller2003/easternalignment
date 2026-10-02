/* Guides hub data (2026-10-02 redesign).
 *
 * /guides/ is now a card hub of topic entrances; each topic has its own page
 * at /guides/<section-id>/ (e.g. /guides/love/). Article URLs are unchanged
 * (/guides/<slug>/). Section assignment still comes from GUIDE_SECTIONS in
 * relatedReaders.ts (first match wins) — this file only adds presentation
 * metadata and the shared loader used by the hub, the topic pages and the
 * guide-page breadcrumb. */
import { GUIDE_SECTIONS, guideSection } from './relatedReaders';

export interface HubGuide {
  slug: string;
  title: string;
  description: string;
  category?: string;
  platform?: string;
  platformName?: string;
  rating?: number;
  affiliateUrl?: string;
  date?: string;
  minutes: number;
  [key: string]: any;
}

export interface TopicMeta {
  /** Short card label (the section heading is used as the topic-page H1). */
  label: string;
  /** One-line hook for the hub card. */
  tagline: string;
  /** Accent hue for the topic (used for icon chip + hero tint). */
  accent: string;
  /** Soft background tint matching the accent. */
  tint: string;
  /** Inline SVG path data (24×24, stroke icons). */
  icon: string;
  seoTitle: string;
  metaDescription: string;
}

export const TOPIC_META: Record<string, TopicMeta> = {
  love: {
    label: 'Love & Relationships',
    tagline: 'Soulmates, twin flames, situationships and every question in between.',
    accent: '#B5615A',
    tint: '#F8ECE8',
    icon: '<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/>',
    seoTitle: 'Love Psychic Reading Guides 2026: Soulmates, Twin Flames & Exes',
    metaDescription: 'Every love and relationship psychic guide in one place — soulmates, twin flames, situationships, and the verified readers who specialise in them.',
  },
  'breakups-ex-recovery': {
    label: 'Breakups & Exes',
    tagline: 'No-contact, reconciliation and post-breakup clarity.',
    accent: '#8B6F9E',
    tint: '#F1ECF4',
    icon: '<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/><path d="M12 7.5l-1.5 3.5 3 2-1.5 3.5"/>',
    seoTitle: 'Breakup & Ex-Recovery Psychic Guides 2026: No Contact & Reunion',
    metaDescription: 'Guides for no-contact, reconciliation and post-breakup questions — and the psychics who specialise in ex-energy readings.',
  },
  mediumship: {
    label: 'Mediumship',
    tagline: 'Evidential mediums and connecting with loved ones who have passed.',
    accent: '#5F7E8F',
    tint: '#EAF0F2',
    icon: '<path d="M12 3c-3.5 3-5 6-5 9a5 5 0 0 0 10 0c0-3-1.5-6-5-9z"/><path d="M12 14v7"/><path d="M9 21h6"/>',
    seoTitle: 'Medium Reading Guides 2026: Evidential Mediums & Loss',
    metaDescription: 'How evidential mediumship works, what to expect, and the mediums worth booking when you want to reach someone who has passed.',
  },
  tarot: {
    label: 'Tarot & Cards',
    tagline: 'Card meanings, spreads, and choosing the right tarot reader.',
    accent: '#A07A3C',
    tint: '#F6EFE2',
    icon: '<rect x="4" y="5" width="10" height="15" rx="1.5" transform="rotate(-8 9 12.5)"/><rect x="10" y="4" width="10" height="15" rx="1.5" transform="rotate(8 15 11.5)"/><path d="M15 9.5l.8 1.7 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2z"/>',
    seoTitle: 'Tarot Reading Guides 2026: Card Meanings, Spreads & Readers',
    metaDescription: 'Tarot card meanings, spreads and how to choose a tarot reader for your specific question — plus the top-rated tarot readers we have tested.',
  },
  'career-money': {
    label: 'Career & Money',
    tagline: 'Job decisions, financial crossroads and business timing.',
    accent: '#5E7F5A',
    tint: '#EAF1E8',
    icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    seoTitle: 'Career & Money Psychic Guides 2026: Jobs, Finances & Timing',
    metaDescription: 'Career and money psychic guides — job decisions, financial crossroads and business timing, with the practical readers who focus on outcomes.',
  },
  spirituality: {
    label: 'Spirituality & Energy',
    tagline: 'Angel numbers, auras, the clairs and past lives.',
    accent: '#7A6BA8',
    tint: '#EFECF6',
    icon: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    seoTitle: 'Angel Numbers, Auras & the Clairs: Spirituality Guides',
    metaDescription: 'Spiritual fundamentals explained — angel numbers, aura colours, the clairs, past lives and animal communication.',
  },
  'getting-started': {
    label: 'Getting Started',
    tagline: 'Costs, preparation, red flags and first-reading offers.',
    accent: '#8B6F4E',
    tint: '#F3EDE7',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    seoTitle: 'Psychic Readings for Beginners 2026: Costs, Red Flags, Offers',
    metaDescription: 'Everything to know before your first psychic reading — costs, preparation, red flags, and which platform offers are actually worth it.',
  },
  'more-guides': {
    label: 'Platforms & More',
    tagline: 'Platform deep-dives, research and everything else.',
    accent: '#6F7A86',
    tint: '#EEF0F2',
    icon: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="13" width="7" height="7" rx="1.5"/><rect x="14" y="13" width="7" height="7" rx="1.5"/>',
    seoTitle: 'Psychic Platform Deep-Dives 2026: Kasamba, Purple Garden, Keen',
    metaDescription: 'Platform deep-dives, original research and other psychic reading guides that do not fit a single topic.',
  },
};

/** Hub display order: highest-value topics first. */
export const TOPIC_ORDER = [
  'love',
  'breakups-ex-recovery',
  'mediumship',
  'tarot',
  'career-money',
  'spirituality',
  'getting-started',
  'more-guides',
];

export const topicUrl = (id: string) => `/guides/${id}/`;

function readingMinutes(raw: string): number {
  const words = raw.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

/** Reader-facing content-type label from the free-form `category` field. */
export function guideKind(g: { category?: string }): string {
  const c = (g.category ?? '').toLowerCase();
  if (c === 'roundup') return 'Top Picks';
  if (c.includes('platform')) return 'Platform Guide';
  if (c === 'beginners') return 'Beginner';
  if (c === 'research') return 'Research';
  return 'Guide';
}

export function loadGuides(): HubGuide[] {
  const mods = import.meta.glob('../content/guides/*.md', { eager: true });
  return Object.entries(mods).map(([path, mod]: [string, any]) => {
    const fm = mod.frontmatter ?? {};
    const raw = typeof mod.rawContent === 'function' ? mod.rawContent() : '';
    return {
      ...fm,
      slug: path.split('/').pop()!.replace('.md', ''),
      date: fm.updatedDate || fm.publishDate,
      minutes: readingMinutes(raw),
    } as HubGuide;
  });
}

/** Commercial-first, then rating, then freshness. Drives featured + order. */
function rank(a: HubGuide, b: HubGuide): number {
  const ac = a.affiliateUrl ? 1 : 0;
  const bc = b.affiliateUrl ? 1 : 0;
  if (ac !== bc) return bc - ac;
  const ar = Number(a.rating) || 0;
  const br = Number(b.rating) || 0;
  if (ar !== br) return br - ar;
  return String(b.date ?? '').localeCompare(String(a.date ?? ''));
}

export interface Topic {
  id: string;
  heading: string;
  intro: string;
  meta: TopicMeta;
  url: string;
  items: HubGuide[];
}

export function loadTopics(): Topic[] {
  const guides = loadGuides();
  const ids = new Set(TOPIC_ORDER);
  // A guide whose slug equals a topic id would be shadowed by the topic page.
  const clash = guides.find((g) => ids.has(g.slug));
  if (clash) throw new Error(`[guideHub] guide slug "${clash.slug}" collides with a topic page URL`);

  const bySection = new Map<string, HubGuide[]>();
  for (const g of guides) {
    const id = guideSection(g).id;
    if (!bySection.has(id)) bySection.set(id, []);
    bySection.get(id)!.push(g);
  }

  return TOPIC_ORDER.map((id) => {
    const s = GUIDE_SECTIONS.find((x) => x.id === id)!;
    return {
      id,
      heading: s.heading,
      intro: s.intro,
      meta: TOPIC_META[id],
      url: topicUrl(id),
      items: (bySection.get(id) ?? []).sort(rank),
    };
  }).filter((t) => t.items.length > 0);
}

export function formatDate(d?: string): string {
  if (!d) return '';
  const dt = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
