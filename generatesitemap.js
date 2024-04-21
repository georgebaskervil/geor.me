import { readdirSync, writeFileSync } from 'fs';
import { relative, basename, join, dirname } from 'path';
import { sync } from 'glob';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let pages = sync('src/pages/**/*.astro').map(file => {
  let page = '/' + relative('src/pages', file).replace(/\\/g, '/').replace(/\.astro$/, '');
  return page === '/index' ? '/' : page;
});

// Remove the dynamic route
pages = pages.filter(page => page !== '/posts/[slug]');

// Get all post slugs
const postSlugs = readdirSync('src/content/posts').map(file => basename(file, '.md'));

// Add the post pages to the pages array
pages = pages.concat(postSlugs.map(slug => `/posts/${slug}`));

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `
  <url>
    <loc>https://georgebaskerville.me${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
`).join('')}
</urlset>`;

writeFileSync(join(__dirname, 'public', 'sitemap.xml'), sitemap);