import { NAVPoint } from './mfApi';

export interface RollingPoint {
  date: Date;
  endDate: Date;
  startNav: number;
  endNav: number;
  return: number;   // CAGR % for ≥1Y windows; absolute % for <1Y windows
  isAnnualised: boolean;
}

export interface RollingStats {
  min: number;
  max: number;
  median: number;
  mean: number;
  positivePct: number;
  count: number;
}

/** Annualised CAGR % */
function cagr(startNav: number, endNav: number, years: number): number {
  if (years <= 0 || startNav <= 0) return NaN;
  return ((endNav / startNav) ** (1 / years) - 1) * 100;
}

/** Absolute return % (no annualisation) */
function absoluteReturn(startNav: number, endNav: number): number {
  if (startNav <= 0) return NaN;
  return (endNav / startNav - 1) * 100;
}

export function computeRolling(nav: NAVPoint[], windowYears: number): RollingPoint[] {
  const results: RollingPoint[] = [];
  const windowMs = windowYears * 365.25 * 24 * 60 * 60 * 1000;
  const annualise = windowYears >= 1;

  for (let i = 0; i < nav.length; i++) {
    const targetTime = nav[i].date.getTime() + windowMs;

    let lo = i + 1, hi = nav.length - 1, best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (nav[mid].date.getTime() >= targetTime) { best = mid; hi = mid - 1; }
      else lo = mid + 1;
    }
    if (best === -1) continue;

    const actualYears = (nav[best].date.getTime() - nav[i].date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (Math.abs(actualYears - windowYears) / windowYears > 0.1) continue;

    const r = annualise
      ? cagr(nav[i].nav, nav[best].nav, actualYears)
      : absoluteReturn(nav[i].nav, nav[best].nav);

    if (!isNaN(r)) results.push({
      date: nav[i].date,
      endDate: nav[best].date,
      startNav: nav[i].nav,
      endNav: nav[best].nav,
      return: r,
      isAnnualised: annualise,
    });
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
