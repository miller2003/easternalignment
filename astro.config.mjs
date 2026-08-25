import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://easternalignment.com',
    trailingSlash: 'always',
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

            // ── hreflang links ─────────────────────────────────────────────────
            // Manual routing (no Astro i18n), so we inject a fully reciprocal
            // hreflang cluster. Every page in a language set must list all others
            // or Google ignores the whole set. An explicit 1:1 map keeps
            // Spanish-only reader pages from pointing at non-existent English URLs.
            const SITE = 'https://easternalignment.com';
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