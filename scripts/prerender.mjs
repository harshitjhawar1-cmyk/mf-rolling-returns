/**
 * Post-build prerendering for SEO.
 * For every "growth plan" fund, writes a static HTML page into dist/fund/<slug>/
 * with fund-specific <title>, meta description, canonical, OG tags and <noscript>
 * content — so crawlers and social scrapers see real content without running JS.
 * The page loads the same JS bundle, which reads the URL and hydrates the fund.
 *
 * Also emits sitemap.xml covering the homepage + every prerendered fund page.
 *
 * Runs automatically after `vite build`. Reads public/funds.json (committed,
 * refreshed weekly by scripts/buildIndex.mjs).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist');
const SITE = 'https://mf-rolling-returns.vercel.app';

const shell = readFileSync(join(dist, 'index.html'), 'utf-8');
const funds = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'funds.json'), 'utf-8'));

const slugify   = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const cleanName = n => n.split(' - ')[0].replace(/\s+(Direct|Regular)\s+.*/i, '').trim() || n;
const esc       = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Only prerender growth plans — the schemes people actually search for.
const growth = funds.filter(f => /growth/i.test(f.n) && !/idcw|dividend|payout|bonus/i.test(f.n));

const urls = ['/'];

for (const f of growth) {
  const slug      = `${slugify(f.n)}-${f.c}`;
  const url       = `/fund/${slug}`;
  const name      = cleanName(f.n);
  const title     = `${name} — Rolling Returns & CAGR Analysis`;
  const desc      = `Rolling returns for ${f.n}. See annualised CAGR across every historical entry date — 1Y, 3Y, 5Y, 7Y & 10Y rolling windows with best, worst, median and consistency metrics. Live NAV data, free.`;
  const canonical = SITE + url;

  const html = shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/,
      `<noscript><h1>${esc(name)} — Rolling Returns</h1><p>${esc(desc)} AMFI scheme code ${f.c}.</p></noscript>`);

  const dir = join(dist, 'fund', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  urls.push(url);
}

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u =>
    `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u === '/' ? '1.0' : '0.7'}</priority></url>`
  ).join('\n') +
  `\n</urlset>\n`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap);

console.log(`✓ Prerendered ${growth.length} fund pages + sitemap (${urls.length} URLs)`);
