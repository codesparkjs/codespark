import { source } from '~/lib/source';

const BASE_URL = 'https://codesparkjs.com';

export async function loader() {
  const pages = source.getPages();

  const staticPages = [
    { url: '/', priority: 1.0 },
    { url: '/docs', priority: 0.9 },
    { url: '/showcase', priority: 0.8 },
    { url: '/playground', priority: 0.8 }
  ];

  const docPages = pages.map(page => ({
    url: page.url,
    priority: 0.7
  }));

  const allPages = [...staticPages, ...docPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    page => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
