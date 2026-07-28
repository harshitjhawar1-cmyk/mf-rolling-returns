import { forwardRef } from 'react';
import { RollingPoint, RollingStats } from '../utils/rollingReturns';

export interface ShareCardData {
  fundName: string;
  category: string;
  house: string;
  windowLabel: string;
  isAbsolute: boolean;
  points: RollingPoint[];
  stats: RollingStats;
}

const W = 1080, PAD = 72, CHART_W = W - PAD * 2, CHART_H = 330;

function fmt(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }

function buildPath(points: RollingPoint[]) {
  if (points.length < 2) return { line: '', area: '', zeroY: CHART_H / 2, x0: 0, x1: CHART_W };
  // sample to ≤200 pts
  const step = Math.max(1, Math.floor(points.length / 200));
  const pts = points.filter((_, i) => i % step === 0);
  const vals = pts.map(p => p.return);
  let min = Math.min(...vals), max = Math.max(...vals);
  const padV = (max - min) * 0.12 || 1;
  min -= padV; max += padV;
  const sx = (i: number) => (i / (pts.length - 1)) * CHART_W;
  const sy = (v: number) => CHART_H - ((v - min) / (max - min)) * CHART_H;
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(p.return).toFixed(1)}`).join(' ');
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const zeroY = Math.max(0, Math.min(CHART_H, sy(0)));
  return { line, area, zeroY };
}

export const ShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(({ data }, ref) => {
  const { fundName, category, house, windowLabel, isAbsolute, points, stats } = data;
  const { line, area, zeroY } = buildPath(points);
  const measure = isAbsolute ? 'absolute return' : 'annualised CAGR';

  const statBox = (label: string, value: string, color: string) => (
    <div style={{ flex: 1, background: '#0d1220', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '18px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 15, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, fontFamily: 'monospace' }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: W, height: W, background: 'linear-gradient(135deg,#0d1220,#080c14)',
        padding: PAD, boxSizing: 'border-box', color: '#e2e8f5',
        fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* glow */}
      <div style={{ position: 'absolute', top: -160, right: -100, width: 500, height: 400, background: 'radial-gradient(ellipse,rgba(99,102,241,.16),transparent 70%)' }} />

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
        <img src="/logo-mark.png" width={56} height={56} style={{ borderRadius: 14 }} crossOrigin="anonymous" />
        <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 30 }}>Rolling Return Calculator</span>
      </div>

      {/* fund name */}
      <div style={{ marginTop: 40, position: 'relative' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 52, lineHeight: 1.1, letterSpacing: '-.02em' }}>
          {fundName}
        </div>
        <div style={{ fontSize: 26, color: '#94a3b8', marginTop: 12 }}>
          {category}{house ? ` · ${house}` : ''}
        </div>
      </div>

      {/* chart label */}
      <div style={{ marginTop: 34, marginBottom: 10, display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 30 }}>{windowLabel} Rolling Returns</span>
        <span style={{ fontSize: 18, color: '#6b7280', fontFamily: 'monospace' }}>{measure} · {stats.count.toLocaleString()} periods</span>
      </div>

      {/* chart */}
      <svg width={CHART_W} height={CHART_H} style={{ position: 'relative' }}>
        <defs>
          <linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={zeroY} x2={CHART_W} y2={zeroY} stroke="#374151" strokeWidth="2" strokeDasharray="6 6" />
        <path d={area} fill="url(#sc-fill)" />
        <path d={line} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>

      {/* stats */}
      <div style={{ display: 'flex', gap: 14, marginTop: 34, position: 'relative' }}>
        {statBox('Best', fmt(stats.max), '#34d399')}
        {statBox('Worst', fmt(stats.min), '#f87171')}
        {statBox('Median', fmt(stats.median), '#e2e8f5')}
        {statBox('Consistency', `${stats.positivePct.toFixed(0)}%`, stats.positivePct >= 80 ? '#34d399' : stats.positivePct >= 60 ? '#fbbf24' : '#f87171')}
      </div>

      {/* footer */}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', paddingTop: 24 }}>
        <span style={{ fontSize: 22, color: '#94a3b8' }}>See how consistent any fund really is — free.</span>
        <span style={{ fontSize: 22, color: '#818cf8', fontWeight: 600, fontFamily: 'monospace' }}>mf-rolling-returns.vercel.app</span>
      </div>
    </div>
  );
});
