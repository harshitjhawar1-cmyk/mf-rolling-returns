import { FundData } from '../App';
import { computeStats } from '../utils/rollingReturns';

interface WindowDef { years: number; label: string; key: string }

interface RollingTableProps {
  funds:   FundData[];
  windows: WindowDef[];
}

function fmt(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function col(n: number) {
  return n >= 0 ? '#34d399' : '#f87171';
}
function pctColor(p: number) {
  return p >= 80 ? '#34d399' : p >= 60 ? '#fbbf24' : '#f87171';
}

/** % of periods whose return exceeded a threshold */
function pctAbove(values: number[], threshold: number): number {
  if (values.length === 0) return 0;
  return (values.filter(v => v >= threshold).length / values.length) * 100;
}

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'right', color: 'var(--txt3)',
  fontWeight: 500, fontSize: 11, fontFamily: 'Fira Code, monospace',
  whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
};
const thLeft: React.CSSProperties = { ...th, textAlign: 'left' };
const td: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'right', fontSize: 13,
  fontFamily: 'Fira Code, monospace', borderBottom: '1px solid var(--border)',
};

export function RollingTable({ funds, windows }: RollingTableProps) {
  const loaded = funds.filter(f => f.series.length > 0);
  if (loaded.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {loaded.map(fd => {
        const shortName = fd.fund.n.split(' - ')[0].split(' Direct')[0].split(' Regular')[0].trim();
        return (
          <div key={fd.fund.c}>
            {/* Fund label (only show when >1 fund) */}
            {loaded.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: fd.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{shortName}</span>
              </div>
            )}

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={thLeft}>Period</th>
                    <th style={th}>Periods</th>
                    <th style={th}>Min</th>
                    <th style={th}>Max</th>
                    <th style={th}>Avg</th>
                    <th style={th}>Median</th>
                    <th style={th}>&gt; 0%</th>
                    <th style={th}>&gt; 7%</th>
                    <th style={th}>&gt; 10%</th>
                    <th style={th}>&gt; 15%</th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map(w => {
                    const pts = fd.series.find(s => s.key === w.key)?.points ?? [];
                    const st  = computeStats(pts);
                    const vals = pts.map(p => p.return);
                    const isAbsolute = w.years < 1;
                    if (!st || pts.length < 10) {
                      return (
                        <tr key={w.key}>
                          <td style={{ ...td, textAlign: 'left', color: 'var(--txt)', fontWeight: 600 }}>{w.label}</td>
                          <td colSpan={9} style={{ ...td, textAlign: 'center', color: 'var(--txt3)', fontSize: 12 }}>
                            Insufficient history
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={w.key}>
                        <td style={{ ...td, textAlign: 'left' }}>
                          <span style={{ color: 'var(--txt)', fontWeight: 600 }}>{w.label}</span>
                          <span style={{ color: 'var(--txt3)', fontSize: 10, marginLeft: 6 }}>
                            {isAbsolute ? 'abs' : 'CAGR'}
                          </span>
                        </td>
                        <td style={{ ...td, color: 'var(--txt3)' }}>{pts.length.toLocaleString()}</td>
                        <td style={{ ...td, color: col(st.min) }}>{fmt(st.min)}</td>
                        <td style={{ ...td, color: col(st.max) }}>{fmt(st.max)}</td>
                        <td style={{ ...td, color: col(st.mean) }}>{fmt(st.mean)}</td>
                        <td style={{ ...td, color: col(st.median) }}>{fmt(st.median)}</td>
                        <td style={{ ...td, color: pctColor(pctAbove(vals, 0)) }}>{pctAbove(vals, 0).toFixed(0)}%</td>
                        <td style={{ ...td, color: 'var(--txt2)' }}>{pctAbove(vals, 7).toFixed(0)}%</td>
                        <td style={{ ...td, color: 'var(--txt2)' }}>{pctAbove(vals, 10).toFixed(0)}%</td>
                        <td style={{ ...td, color: 'var(--txt2)' }}>{pctAbove(vals, 15).toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'Fira Code, monospace', lineHeight: 1.6 }}>
        &gt; X% columns show the share of rolling periods that returned at least X%. For 1M/3M/6M these are absolute returns; 1Y+ are annualised CAGR.
      </p>
    </div>
  );
}
