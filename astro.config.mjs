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
            !page.includes('/tools/'),
    })],
    redirects: {
        '/reviews/kasamba-psychics/': '/reviews/kasamba/',
        '/reviews/keen-psychics/': '/reviews/keen/',
    },
});