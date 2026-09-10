import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import sitemap from '@astrojs/sitemap';
import rehypeAffiliateLinks from './src/plugins/rehype-affiliate-links.mjs';

// ── <lastmod> ────────────────────────────────────────────────────────────────
// Astro's sitemap integration cannot know when a page's content last changed, so
// it emits no <lastmod> at all (2026-09-10 audit: 0 of 299 entries had one). That
// removes the single strongest recrawl signal we have, on a site whose value
// depends on content freshness. The dates already exist in the content
// frontmatter, so read them once at config load.
//
// Deliberately NOT falling back to "now": stamping every URL with the build date
// makes lastmod meaningless the moment you rebuild without changing content, and
// Google learns to discount it. Pages with no known date simply omit lastmod.
const SITE = 'https://easternalignment.com';

function buildLastmodMap() {
  const map = new Map();
  const contentDir = path.resolve('./src/content');
  const roots = {
    guides: (_p, slug) => `/guides/${slug}/`,
    comparisons: (_p, slug) => `/comparisons/${slug}/`,
    reviews: (_p, slug) => `/reviews/${slug}/`,
    readers: (platform, slug) => `/reviews/${platform}/${slug}/`,
    'es-readers': (platform, slug) => `/es/resenas/${platform}/${slug}/`,
  };
  const walk = (dir) => {
    let out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out = out.concat(walk(p));
      else if (e.name.endsWith('.md') && !e.name.startsWith('_')) out.push(p);
    }
    return out;
  };
  for (const [collection, toUrl] of Object.entries(roots)) {
    const dir = path.join(contentDir, collection);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const block = fs.readFileSync(file, 'utf8').split(/^---\s*$/m)[1] || '';
      const pick = (k) => {
        const m = block.match(new RegExp(`^${k}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'));
        return m ? m[1] : null;
      };
      const date = pick('updatedDate') || pick('publishDate');
      if (!date) continue;
      const rel = path.relative(dir, file).replace(/\\/g, '/').replace(/\.md$/, '');
      const segs = rel.split('/');
      const slug = segs.pop();
      map.set(SITE + toUrl(segs[0], slug), date);
    }
  }
  return map;
}

let LASTMOD = new Map();
try {
  LASTMOD = buildLastmodMap();
} catch (err) {
  // Never let a metadata nicety break the build.
  console.warn('[sitemap] lastmod map unavailable:', err && err.message);
}

export default defineConfig({
    site: 'https://easternalignment.com',
    trailingSlash: 'always',
    // Affiliate links written inline in Markdown (`[text](/go/slug/)`) used to
    // render as bare dofollow anchors. Google requires paid/affiliate links to
    // carry rel="sponsored". Stamping them at the rehype level means the rule
    // holds for every current and future page, not just the ones we remember.
    markdown: {
        rehypePlugins: [rehypeAffiliateLinks],
    },
    integrations: [sitemap({
        filter: (page) =>
            !page.includes('/privacy/') &&
            !page.includes('/terms/') &&
            !page.includes('/go/') &&
            !page.includes('/content-manager') &&
            // noindex'd programmatic sections: keep them out of the sitemap so
            // the sitemap only lists pages we actually want ranked.
            !page.includes('/astrology/') &&
            // Spanish legal pages (noindexed) — keep OUT of the sitemap.
            // NOTE: /es/divulgacion/ is intentionally indexable (it carries
            // `index,follow` and the English /disclosure/ page points at it via
            // hreflang), so it MUST stay in the sitemap to keep the cluster valid.
            !page.includes('/es/privacidad/') &&
            !page.includes('/es/terminos/') &&
            // /red-flags/ is a noindex placeholder — a noindex page in the
            // sitemap is a contradiction Google reports as an error.
            !page.includes('/red-flags/') &&
            // 404 pages are never sitemap material. /es/404/ was slipping in
            // (the integration only special-cases the English 404).
            !/\/404\/?$/.test(page) &&
            // Template files should never generate pages, but be safe
            !page.includes('_plantilla'),
        serialize(item) {
            // Set changefreq and priority
            if (item.url === 'https://easternalignment.com/' || item.url === 'https://easternalignment.com/es/') {
                item.changefreq = 'weekly';
                item.priority = 1.0;
            } else if (item.url.includes('/reviews/') || item.url.includes('/resenas/')) {
                item.changefreq = 'monthly';
                item.priority = 0.9;
            } else {
                item.changefreq = 'monthly';
                item.priority = 0.7;
            }

            // Real content date where we have one (see buildLastmodMap above).
            const lm = LASTMOD.get(item.url);
            if (lm) item.lastmod = lm;

            // hreflang links ─────────────────────────────────────────────────
            // Manual routing (no Astro i18n), so we inject a fully reciprocal
            // hreflang cluster. Every page in a language set must list all others
            // or Google ignores the whole set. An explicit 1:1 map keeps
            // Spanish-only reader pages from pointing at non-existent English URLs.
            const esToEn = {
                [`${SITE}/es/`]: `${SITE}/`,
                [`${SITE}/es/acerca-de/`]: `${SITE}/about/`,
                [`${SITE}/es/divulgacion/`]: `${SITE}/disclosure/`,
                [`${SITE}/es/privacidad/`]: `${SITE}/privacy/`,
                [`${SITE}/es/terminos/`]: `${SITE}/terms/`,
                [`${SITE}/es/resenas/`]: `${SITE}/reviews/`,
                // NOTE: /es/resenas/psiquicos-web/ has NO English equivalent page
                // (reviews/psiquicos-web/ 404s), so it stays an es-only, self-referential
                // cluster — do NOT map it to a non-existent en URL.
                [`${SITE}/es/resenas/purple-garden-es/`]: `${SITE}/reviews/purple-garden/`,
            };
            const enToEs = Object.fromEntries(
                Object.entries(esToEn).map(([es, en]) => [en, es])
            );

            if (item.url.startsWith(`${SITE}/es/`)) {
                const en = esToEn[item.url];
                if (en) {
                    item.links = [
                        { lang: 'es', url: item.url },
                        { lang: 'es-419', url: item.url },
                        { lang: 'en', url: en },
                        { lang: 'x-default', url: en },
                    ];
                } else {
                    // Spanish-only page (e.g. individual reader reviews):
                    // self-referential so it forms a valid standalone cluster.
                    item.links = [
                        { lang: 'es', url: item.url },
                        { lang: 'es-419', url: item.url },
                        { lang: 'x-default', url: item.url },
                    ];
                }
            } else if (enToEs[item.url]) {
                const es = enToEs[item.url];
                item.links = [
                    { lang: 'en', url: item.url },
                    { lang: 'x-default', url: item.url },
                    { lang: 'es', url: es },
                    { lang: 'es-419', url: es },
                ];
            } else {
                // English-only page: declare its own language.
                item.links = [
                    { lang: 'en', url: item.url },
                    { lang: 'x-default', url: item.url },
                ];
            }
            
            return item;
        }
    })],
    redirects: {
        '/reviews/kasamba-psychics/': '/reviews/kasamba/',
        '/reviews/keen-psychics/': '/reviews/keen/',
    },
});