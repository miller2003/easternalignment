import { defineCollection, z } from 'astro:content';

// Shared SEO/Schema fields — optional on all collections
const seoFields = {
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaRobots: z.string().optional(),
  canonicalUrl: z.string().optional(),
  ogImage: z.string().optional(),
  schemaHeadline: z.string().optional(),
  schemaDescription: z.string().optional(),
  schemaAuthor: z.string().optional(),
  schemaDatePublished: z.string().optional(),
  customSchema: z.string().optional(),
};

const reviews = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    platformName: z.string(),
    rating: z.number().min(0).max(5),
    verdict: z.string(),
    affiliateUrl: z.string().default('#'),
    freeOffer: z.string().optional(),
    pricing: z.string().optional(),
    bestFor: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    rank: z.number().default(1),
    ...seoFields,
  }),
});

const comparisons = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    platforms: z.array(z.string()),
    winner: z.string().optional(),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    ...seoFields,
  }),
});

const readers = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    platform: z.string().default('keen'),
    platformName: z.string(),
    rating: z.number().min(0).max(5),
    verdict: z.string(),
    affiliateUrl: z.string().default('#'),
    freeOffer: z.string().optional(),
    pricing: z.string().optional(),
    bestFor: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    entities: z.array(z.string()).optional(),
    avatarUrl: z.string().optional(),
    ctaOverride: z.string().optional(),
    unavailable: z.boolean().optional(),
    ...seoFields,
  }),
});

const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional(),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    ...seoFields,
  }).passthrough(),
});

// NOTE: the `blog` collection + src/pages/blogs/[slug].astro route were removed
// on 2026-08-26 (P0 technical hygiene): zero content, zero internal links, the
// dead route only polluted crawl budget (GSC: 14 impressions, 0 clicks).

// ─── Spanish /es subsite reader collection ───────────────────────────────────
// Content lives in src/content/es-readers/{psiquicos-web,purple-garden-es}/*.md
const esReaders = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    platformName: z.string(),       // e.g. "Psíquicos Web: María Luz"
    platform: z.enum(['psiquicos', 'purple-garden-es']),
    rating: z.number().min(0).max(5),
    verdict: z.string(),
    freeOffer: z.string().optional(),
    pricing: z.string().optional(),
    bestFor: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    pros: z.array(z.string()).default([]),
    cons: z.array(z.string()).default([]),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    avatarUrl: z.string().optional(),
    entities: z.array(z.string()).optional(),
    // Optional: URL of the corresponding English review page (if one exists)
    // Used to set hreflang="en" in <head>. Leave empty if no English equivalent.
    hreflangEn: z.string().optional(),
    ...seoFields,
  }),
});

export const collections = { reviews, comparisons, guides, readers, esReaders };
