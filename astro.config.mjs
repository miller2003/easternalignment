import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://easternalignment.com',
    trailingSlash: 'always',
    integrations: [sitemap({
        filter: (page) =>
            !page.includes('/privacy/'),
    })],
});