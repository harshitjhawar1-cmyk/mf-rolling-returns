import { useState } from 'react';
import { RollingStats } from '../utils/rollingReturns';

interface StatsPanelProps {
  windowLabel: string;
  stats: RollingStats;
}

function fmt(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}
function col(n: number) {
  return n >= 0 ? '#34d399' : '#f87171';
}

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        width: 13, height: 13, borderRadius: '50%',
        border: '1px solid var(--txt3)', color: 'var(--txt3)',
        fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'help', fontFamily: 'Fira Code, monospace', lineHeight: 1,
      }}>i</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '150%', left: '50%', transform: 'translateX(-50%)',
          width: 200, padding: '8px 12px', borderRadius: 8, zIndex: 100,
          background: '#0d1220', border: '1px solid rgba(255,255,255,.15)',
          color: 'var(--txt2)', fontSize: 11, lineHeight: 1.5, fontWeight: 400,
          textTransform: 'none', letterSpacing: 'normal',
          boxShadow: '0 12px 40px rgba(0,0,0,.6)', pointerEvents: 'none',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

export function StatsPanel({ windowLabel, stats }: StatsPanelProps) {
  const isAbsolute = ['1M', '3M', '6M'].includes(windowLabel);
  const measure = isAbsolute ? 'absolute return' : 'annualised CAGR';

  const cards = [
    {
      label: 'Best',
      value: fmt(stats.max),
      color: col(stats.max),
      sub: `${windowLabel} ${isAbsolute ? 'absolute' : 'CAGR'}`,
      tip: `The highest ${measure} across all ${windowLabel} periods. This is the best-case outcome — investing at the perfect time.`,
    },
    {
      label: 'Worst',
      value: fmt(stats.min),
      color: col(stats.min),
      sub: `${windowLabel} ${isAbsolute ? 'absolute' : 'CAGR'}`,
      tip: `The lowest ${measure} across all ${windowLabel} periods. This is the worst-case outcome — investing at the worst time.`,
    },
    {
      label: 'Median',
      value: fmt(stats.median),
      color: col(stats.median),
      sub: `${windowLabel} ${isAbsolute ? 'absolute' : 'CAGR'}`,
      tip: `The middle value — half of all ${windowLabel} periods did better, half did worse. More representative than the average as it ignores extreme outliers.`,
    },
    {
      label: 'Average',
      value: fmt(stats.mean),
      color: col(stats.mean),
      sub: `${windowLabel} ${isAbsolute ? 'absolute' : 'CAGR'}`,
      tip: `The arithmetic mean of ${measure} across all ${stats.count.toLocaleString()} ${windowLabel} periods.`,
    },
    {
      label: 'Consistency',
      value: stats.positivePct.toFixed(1) + '%',
      color: stats.positivePct >= 80 ? '#34d399' : stats.positivePct >= 60 ? '#fbbf24' : '#f87171',
      sub: 'periods positive',
      tip: `Return consistency — the % of all ${windowLabel} periods that ended with a positive return. Higher means the fund made money regardless of when you entered. 100% means you never lost money over any ${windowLabel} period.`,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 16, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase',
            letterSpacing: '.06em', marginBottom: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fira Code, monospace',
          }}>
            {c.label}
            <InfoTip text={c.tip} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.color, fontFamily: 'Fira Code, monospace', lineHeight: 1.1 }}>
            {c.value}
          </div>
          <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 4, fontFamily: 'Fira Code, monospace' }}>
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
