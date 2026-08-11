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

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string().optional(),
    updatedDate: z.string().optional(),
    ...seoFields,
  }).passthrough(),
});

export const collections = { reviews, comparisons, guides, blog, readers };
