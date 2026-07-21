import { NAVPoint } from './mfApi';

export interface RollingPoint {
  date: Date;
  endDate: Date;
  startNav: number;
  endNav: number;
  return: number;
}

export interface RollingStats {
  min: number;
  max: number;
  median: number;
  mean: number;
  positivePct: number; // % of periods with positive return
  count: number;
}

/** CAGR between two NAV points */
function cagr(startNav: number, endNav: number, years: number): number {
  if (years <= 0 || startNav <= 0) return NaN;
  return ((endNav / startNav) ** (1 / years) - 1) * 100;
}

/**
 * Compute rolling returns for a given window (in years).
 * For each day d, finds the NAV entry ~windowYears later and computes CAGR.
 */
export function computeRolling(nav: NAVPoint[], windowYears: number): RollingPoint[] {
  const results: RollingPoint[] = [];
  const windowMs = windowYears * 365.25 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < nav.length; i++) {
    const targetTime = nav[i].date.getTime() + windowMs;

    // Binary search for the closest future date
    let lo = i + 1, hi = nav.length - 1, best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (nav[mid].date.getTime() >= targetTime) { best = mid; hi = mid - 1; }
      else lo = mid + 1;
    }
    if (best === -1) continue;

    const actualYears = (nav[best].date.getTime() - nav[i].date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    // Only include if actual window is within 10% of target
    if (Math.abs(actualYears - windowYears) / windowYears > 0.1) continue;

    const r = cagr(nav[i].nav, nav[best].nav, actualYears);
    if (!isNaN(r)) results.push({ date: nav[i].date, endDate: nav[best].date, startNav: nav[i].nav, endNav: nav[best].nav, return: r });
  }

  return results;
}

export function computeStats(points: RollingPoint[]): RollingStats | null {
  if (points.length === 0) return null;
  const values = points.map(p => p.return).sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mid = Math.floor(values.length / 2);
  return {
    min: values[0],
    max: values[values.length - 1],
    median: values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid],
    mean: sum / values.length,
    positivePct: (values.filter(v => v > 0).length / values.length) * 100,
    count: values.length,
  };
}
