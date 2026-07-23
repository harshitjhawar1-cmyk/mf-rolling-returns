import { FundEntry } from '../components/SearchBox';

/** "UTI Nifty 50 Index Fund - Direct Growth" → "uti-nifty-50-index-fund-direct-growth" */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Canonical URL for a fund page: /fund/<name-slug>-<code> */
export function fundUrl(f: FundEntry): string {
  return `/fund/${slugify(f.n)}-${f.c}`;
}

/** Extract the scheme code from a /fund/... path (trailing digits). */
export function codeFromPath(path: string): number | null {
  const m = path.match(/^\/fund\/.*-(\d+)\/?$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Rough human name from a fund slug, used only as a placeholder while NAV loads. */
export function nameFromPath(path: string): string {
  const m = path.match(/^\/fund\/(.+)-\d+\/?$/);
  if (!m) return 'Loading…';
  return m[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
