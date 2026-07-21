export interface NAVPoint {
  date: Date;
  nav: number;
}

export interface FundMeta {
  schemeCode: number;
  schemeName: string;
  fundHouse: string;
  schemeCategory: string;
}

/** Parse "DD-MM-YYYY" or "DD-MMM-YYYY" → Date */
function parseDate(s: string): Date {
  const parts = s.split('-');
  if (parts.length !== 3) return new Date(NaN);
  const [d, m, y] = parts;
  // Numeric month
  if (/^\d+$/.test(m)) return new Date(+y, +m - 1, +d);
  // Named month
  return new Date(`${d} ${m} ${y}`);
}

export async function fetchNAVHistory(schemeCode: number): Promise<{ meta: FundMeta; nav: NAVPoint[] }> {
  const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'SUCCESS') throw new Error('API error');

  const meta: FundMeta = {
    schemeCode: json.meta.scheme_code,
    schemeName: json.meta.scheme_name,
    fundHouse: json.meta.fund_house,
    schemeCategory: json.meta.scheme_category,
  };

  // API returns newest-first; reverse to oldest-first
  const nav: NAVPoint[] = (json.data as { date: string; nav: string }[])
    .map(d => ({ date: parseDate(d.date), nav: parseFloat(d.nav) }))
    .filter(d => !isNaN(d.date.getTime()) && !isNaN(d.nav))
    .reverse();

  return { meta, nav };
}
