// Builds a top-tier schema.org WebApplication node for the site's free tools.
// Entity-linked to the site Organization (#organization) and author Sarah (#sarah)
// declared in BaseLayout, so Google can connect each tool to the brand graph.
//
// Usage in a tool page:
//   import { buildWebApplication } from '../../lib/toolSchema';
//   const toolSchema = {
//     "@context": "https://schema.org",
//     "@graph": [
//       buildWebApplication({ name, url, description }),
//       { ...FAQPage... },
//     ],
//   };

const SITE = 'https://easternalignment.com';

export interface ToolSchemaInput {
  name: string;
  url: string;
  description: string;
  applicationSubCategory?: string;
  featureList?: string[];
}

export function buildWebApplication(input: ToolSchemaInput) {
  return {
    '@type': 'WebApplication',
    '@id': `${input.url}#webapp`,
    name: input.name,
    url: input.url,
    applicationCategory: 'LifestyleApplication',
    applicationSubCategory: input.applicationSubCategory ?? 'Spiritual & Astrology Tools',
    operatingSystem: 'Web',
    browserRequirements: 'Requires a modern HTML5 browser and JavaScript.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: input.description,
    ...(input.featureList ? { featureList: input.featureList } : {}),
    publisher: { '@id': `${SITE}/#organization` },
    author: { '@id': `${SITE}/#sarah` },
  };
}
