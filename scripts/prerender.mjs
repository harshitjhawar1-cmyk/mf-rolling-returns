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
const escJson   = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const AMCS = ['Aditya Birla Sun Life','Axis','Bandhan','Bank of India','Baroda BNP Paribas','Canara Robeco','DSP','Edelweiss','Franklin','HDFC','HSBC','ICICI Prudential','IDFC','Invesco','ITI','JM Financial','Kotak','LIC','Mahindra Manulife','Mirae Asset','Motilal Oswal','Navi','Nippon India','PGIM','PPFAS','Parag Parikh','Quant','quant','Quantum','SBI','Samco','Sundaram','Tata','Taurus','Union','UTI','WhiteOak Capital','360 ONE','Groww','Bajaj Finserv'];
const deriveHouse = n => { const f = AMCS.find(a => n.toLowerCase().startsWith(a.toLowerCase())); return f ? (f === 'quant' ? 'Quant' : f) : n.split(/\s+/).slice(0,2).join(' '); };
const derivePlan  = n => /\bdirect\b/i.test(n) ? 'Direct' : /\bregular\b/i.test(n) ? 'Regular' : '';

function deriveCategory(name) {
  const n = name.toLowerCase();
  if (/nifty|sensex|index|bse |nse /.test(n) && !/debt|bond|sdl|gilt|psu/.test(n)) return ['Index Fund','passively tracks a market index like the Nifty 50 or Sensex'];
  if (/elss|tax saver|tax saving/.test(n)) return ['ELSS (Tax Saver) Fund','invests in equities with a 3-year lock-in and Section 80C tax benefit'];
  if (/large & mid|large and mid/.test(n)) return ['Large & Mid Cap Fund','splits investments between large-cap and mid-cap companies'];
  if (/large ?cap|bluechip|blue chip/.test(n)) return ['Large Cap Fund','invests mainly in India’s largest, most established companies'];
  if (/mid ?cap/.test(n)) return ['Mid Cap Fund','invests in mid-sized companies with higher growth potential and volatility'];
  if (/small ?cap/.test(n)) return ['Small Cap Fund','invests in small, emerging companies — high growth potential and risk'];
  if (/multi ?cap/.test(n)) return ['Multi Cap Fund','invests across large, mid and small-cap stocks'];
  if (/flexi ?cap/.test(n)) return ['Flexi Cap Fund','invests across market caps with full flexibility'];
  if (/focused/.test(n)) return ['Focused Fund','holds a concentrated portfolio of up to 30 high-conviction stocks'];
  if (/value/.test(n)) return ['Value Fund','follows a value-investing strategy'];
  if (/contra/.test(n)) return ['Contra Fund','takes contrarian bets against market trends'];
  if (/nasdaq|s&p 500|us equity|global|international|world/.test(n)) return ['International Fund','invests in overseas equities for global diversification'];
  if (/gold/.test(n)) return ['Gold Fund','tracks the price of physical gold'];
  if (/silver/.test(n)) return ['Silver Fund','tracks the price of physical silver'];
  if (/balanced advantage|dynamic asset/.test(n)) return ['Balanced Advantage Fund','dynamically shifts between equity and debt'];
  if (/aggressive hybrid/.test(n)) return ['Aggressive Hybrid Fund','holds mostly equity with a debt cushion'];
  if (/arbitrage/.test(n)) return ['Arbitrage Fund','exploits price differences between cash and futures markets'];
  if (/liquid/.test(n)) return ['Liquid Fund','invests in very short-term instruments for parking cash'];
  if (/corporate bond/.test(n)) return ['Corporate Bond Fund','invests mainly in high-rated corporate bonds'];
  if (/gilt/.test(n)) return ['Gilt Fund','invests in government securities with no credit risk'];
  if (/debt|bond|income|sdl/.test(n)) return ['Debt Fund','invests in fixed-income instruments like bonds'];
  return ['Equity Fund','invests primarily in stocks for long-term growth'];
}

// Build the visible-to-crawlers static content + FAQ for a fund
function fundContent(f) {
  const name = cleanName(f.n);
  const house = deriveHouse(f.n);
  const plan = derivePlan(f.n);
  const [category, blurb] = deriveCategory(f.n);
  const an = /^[aeiou]/i.test(category) ? 'an' : 'a';

  const faqs = [
    [`What are the rolling returns of ${name}?`, `Rolling returns for ${name} measure its annualised return (CAGR) for every possible entry date across its history — not just one flattering period. The interactive chart shows its 1-year, 3-year, 5-year, 7-year and 10-year rolling returns, with the best, worst, median and average outcome for each window.`],
    [`Is ${name} a consistent performer?`, `Judge consistency by the share of positive periods and the gap between the best and worst rolling return. A high share of positive periods and a narrow range mean ${name} delivered more reliably regardless of when you invested.`],
    [`What is the 5-year return of ${name}?`, `Rather than one 5-year number that depends on the start date, this tool shows the full range of 5-year returns ${name} has delivered across every historical starting point — its best, worst, median and average 5-year CAGR.`],
    [`How is ${name}'s performance calculated?`, `Returns are computed from ${name}'s official daily NAV history from AMFI via mfapi.in. Windows of one year or more show annualised CAGR; 1-month, 3-month and 6-month windows show absolute return.`],
  ];

  const html =
    `<article>` +
    `<h1>${esc(name)} — Rolling Returns &amp; Performance Analysis</h1>` +
    `<p><strong>${esc(name)}</strong>${plan ? ` (${plan} Plan)` : ''} is ${an} <strong>${esc(category)}</strong>${house ? ` from ${esc(house)} Mutual Fund` : ''} — a fund that ${esc(blurb)}. This page analyses its rolling returns, long-term performance and return consistency using its full NAV history (AMFI scheme code ${f.c}).</p>` +
    `<p>Most sites show ${esc(name)}'s return for a single hand-picked period, which can make almost any fund look good or bad depending on the dates chosen. This tool instead tests ${esc(name)} across every possible entry date, so you can see how it would have performed no matter when you invested — the honest way to judge ${an} ${esc(category.toLowerCase())}.</p>` +
    `<h2>${esc(name)} rolling returns explained</h2>` +
    `<p>Each point on the chart is ${esc(name)}'s annualised CAGR for a holding period (1M to 10Y) ending on that date. The statistics show the best, worst, median and average return, plus how often the fund ended positive — a direct measure of consistency.</p>` +
    `<h2>Frequently asked questions</h2>` +
    faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('') +
    `</article>`;

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };

  return { noscript: html, faqLd: JSON.stringify(faqLd) };
}

// Prerender Direct Growth plans — the highest-search-value subset, and small
// enough to stay within hosting file-count limits. Every other fund still works
// via client-side routing (SPA fallback); it just isn't statically prerendered.
const growth = funds.filter(f =>
  /growth/i.test(f.n) &&
  /direct/i.test(f.n) &&
  !/idcw|dividend|payout|bonus/i.test(f.n)
);

const urls = ['/'];

for (const f of growth) {
  const slug      = `${slugify(f.n)}-${f.c}`;
  const url       = `/fund/${slug}`;
  const name      = cleanName(f.n);
  const title     = `${name} — Rolling Returns & CAGR Analysis`;
  const desc      = `Rolling returns for ${f.n}. See annualised CAGR across every historical entry date — 1Y, 3Y, 5Y, 7Y & 10Y rolling windows with best, worst, median and consistency metrics. Live NAV data, free.`;
  const canonical = SITE + url;

  const { noscript, faqLd } = fundContent(f);

  const html = shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    // per-fund FAQ structured data (before </head>)
    .replace(/<\/head>/, `  <script type="application/ld+json">${faqLd}</script>\n  </head>`)
    // rich, crawlable content fallback
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${noscript}</noscript>`);

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
