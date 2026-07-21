import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { RollingPoint } from '../utils/rollingReturns';
import { FundData } from '../App';
import { track } from '../utils/analytics';

const WINDOW_COLORS: Record<string, string> = {
  w1m:'#e879f9', w3m:'#fb923c', w6m:'#facc15',
  w1y:'#60a5fa', w3y:'#34d399', w5y:'#f59e0b', w7y:'#a78bfa', w10y:'#f87171',
};
const WINDOW_LABELS: Record<string, string> = {
  w1m:'1M', w3m:'3M', w6m:'6M', w1y:'1Y', w3y:'3Y', w5y:'5Y', w7y:'7Y', w10y:'10Y',
};

type Granularity = 'daily'|'weekly'|'monthly'|'quarterly'|'yearly';
const GRANULARITIES: { value: Granularity; label: string; days: number }[] = [
  { value:'daily',     label:'Daily',     days:1   },
  { value:'weekly',    label:'Weekly',    days:7   },
  { value:'monthly',   label:'Monthly',   days:30  },
  { value:'quarterly', label:'Quarterly', days:90  },
  { value:'yearly',    label:'Yearly',    days:365 },
];

function sample(points: RollingPoint[], days: number): RollingPoint[] {
  if (days <= 1) return points;
  const bucketMs = days * 24 * 60 * 60 * 1000;
  const seen = new Set<number>();
  return points.filter(p => {
    const bucket = Math.floor(p.endDate.getTime() / bucketMs);
    if (seen.has(bucket)) return false;
    seen.add(bucket);
    return true;
  });
}

interface ChartRow { ts: number; [k: string]: number }
interface Meta { startTs: number; startNav: number; endNav: number; isAnnualised: boolean; label: string }
const metaMap = new Map<string, Meta>();

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { month:'short', year:'numeric' });
}

interface RollingChartProps {
  funds:      FundData[];
  activeKeys: string[];
  isCompare:  boolean;
}

export function RollingChart({ funds, activeKeys, isCompare }: RollingChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const days = GRANULARITIES.find(g => g.value === granularity)!.days;

  metaMap.clear();
  const byTs = new Map<number, ChartRow>();

  if (isCompare) {
    // Multi-fund: one line per fund, one window key
    const wKey = activeKeys[0];
    for (const fd of funds) {
      const pts = fd.series.find(s => s.key === wKey)?.points ?? [];
      const sampled = sample(pts, days);
      for (const p of sampled) {
        const ts = p.endDate.getTime();
        if (!byTs.has(ts)) byTs.set(ts, { ts });
        const key = `f${fd.fund.c}`;
        byTs.get(ts)![key] = +p.return.toFixed(2);
        metaMap.set(`${ts}_${key}`, { startTs: p.date.getTime(), startNav: p.startNav, endNav: p.endNav, isAnnualised: p.isAnnualised, label: fd.fund.n.split(' - ')[0] });
      }
    }
  } else {
    // Single fund: one line per window
    const fd = funds[0];
    if (!fd) return null;
    for (const wKey of activeKeys) {
      const pts = fd.series.find(s => s.key === wKey)?.points ?? [];
      const sampled = sample(pts, days);
      for (const p of sampled) {
        const ts = p.endDate.getTime();
        if (!byTs.has(ts)) byTs.set(ts, { ts });
        byTs.get(ts)![wKey] = +p.return.toFixed(2);
        metaMap.set(`${ts}_${wKey}`, { startTs: p.date.getTime(), startNav: p.startNav, endNav: p.endNav, isAnnualised: p.isAnnualised, label: WINDOW_LABELS[wKey] });
      }
    }
  }

  const data = Array.from(byTs.values()).sort((a, b) => a.ts - b.ts);

  const lineKeys  = isCompare ? funds.map(fd => `f${fd.fund.c}`) : activeKeys;
  const colorOf   = (key: string) => isCompare
    ? (funds.find(fd => `f${fd.fund.c}` === key)?.color ?? '#888')
    : (WINDOW_COLORS[key] ?? '#888');
  const labelOf   = (key: string) => isCompare
    ? (funds.find(fd => `f${fd.fund.c}` === key)?.fund.n.split(' - ')[0].split(' Direct')[0].trim() ?? key)
    : (WINDOW_LABELS[key] ?? key);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Granularity */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:'var(--txt3)', fontFamily:'Fira Code' }}>Granularity:</span>
        {GRANULARITIES.map(g => (
          <button key={g.value} onClick={() => { setGranularity(g.value); track('granularity_changed', { granularity: g.value }); }}
            style={{
              padding:'4px 12px', borderRadius:999, fontSize:12, fontWeight:500,
              border:`1px solid ${granularity === g.value ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)'}`,
              background: granularity === g.value ? 'rgba(255,255,255,.1)' : 'transparent',
              color: granularity === g.value ? 'var(--txt)' : 'var(--txt3)',
              cursor:'pointer', transition:'all .15s',
              fontFamily:'Plus Jakarta Sans, sans-serif',
            }}>
            {g.label}
          </button>
        ))}
        <span style={{ fontSize:11, color:'var(--txt3)', fontFamily:'Fira Code', marginLeft:4 }}>
          {data.length.toLocaleString()} pts
        </span>
      </div>

      {/* Chart */}
      <div style={{ width:'100%', height:380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top:8, right:16, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="ts" type="number" domain={['dataMin','dataMax']} tickFormatter={fmtDate}
              tick={{ fill:'#6b7280', fontSize:11 }} tickLine={false} scale="time" />
            <YAxis tickFormatter={v => `${v>0?'+':''}${v}%`}
              tick={{ fill:'#6b7280', fontSize:11 }} tickLine={false} axisLine={false} width={58} />
            <Tooltip
              contentStyle={{ background:'#0d1220', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 14px' }}
              labelStyle={{ color:'#6b7280', fontSize:11 }}
              formatter={(value: number, name: string, props: { payload?: ChartRow }) => {
                const ts  = props?.payload?.ts;
                const meta = ts != null ? metaMap.get(`${ts}_${name}`) : undefined;
                return [
                  <span key="v" style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <span style={{ fontWeight:700, fontSize:14, color: value>=0?'#34d399':'#f87171' }}>{value>=0?'+':''}{value}%</span>
                    {meta && <>
                      <span style={{ color:'#818cf8', fontSize:10 }}>{meta.isAnnualised ? 'annualised CAGR' : 'absolute return'}</span>
                      <span style={{ color:'#9ca3af', fontSize:11 }}>{fmtDate(meta.startTs)} → {fmtDate(Number(ts))}</span>
                      <span style={{ color:'#6b7280', fontSize:11 }}>NAV {meta.startNav.toFixed(3)} → {meta.endNav.toFixed(3)}</span>
                    </>}
                  </span>,
                  labelOf(name),
                ];
              }}
              labelFormatter={ts => `Exit: ${fmtDate(Number(ts))}`}
            />
            <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" />
            <Legend formatter={val => <span style={{ color:colorOf(String(val)), fontSize:12 }}>{labelOf(String(val))}</span>} />
            {lineKeys.map(k => (
              <Line key={k} type="monotone" dataKey={k} stroke={colorOf(k)} dot={false} strokeWidth={1.5} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
