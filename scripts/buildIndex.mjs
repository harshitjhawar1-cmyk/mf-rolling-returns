/**
 * Fetches the AMFI NAVAll.txt file and extracts scheme codes + names.
 * Writes a compact funds.json to public/ for the frontend to consume.
 *
 * Run: node scripts/buildIndex.mjs
 * Called weekly by GitHub Actions.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'funds.json');

// AMFI moved to portal subdomain; semicolon-delimited
// Format: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;NAV;Date
const AMFI_URL = 'https://portal.amfiindia.com/spages/NAVAll.txt';

async function main() {
  console.log('Fetching AMFI fund list…');
  const res = await fetch(AMFI_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  const funds = [];
  const seen = new Set();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(';');
    if (parts.length < 4) continue;

    const code = parseInt(parts[0].trim(), 10);
    const name = parts[3].trim();

    if (isNaN(code) || !name || seen.has(code)) continue;
    seen.add(code);

    funds.push({ c: code, n: name });
  }

  funds.sort((a, b) => a.c - b.c);

  mkdirSync(join(__dirname, '..', 'public'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(funds));
  console.log(`✓ Written ${funds.length} funds to public/funds.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
