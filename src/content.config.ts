import { defineCollection, z } from 'astro:content';

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
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string().optional(),
    updatedDate: z.string().optional(),
  }),
});

export const collections = { reviews, comparisons, guides, blog };
