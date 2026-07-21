import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { RollingPoint } from '../utils/rollingReturns';

const KEY_COLORS: Record<string, string> = {
  w1m:  '#e879f9',
  w3m:  '#fb923c',
  w6m:  '#facc15',
  w1y:  '#60a5fa',
  w3y:  '#34d399',
  w5y:  '#f59e0b',
  w7y:  '#a78bfa',
  w10y: '#f87171',
};

const KEY_LABELS: Record<string, string> = {
  w1m: '1M', w3m: '3M', w6m: '6M',
  w1y: '1Y', w3y: '3Y', w5y: '5Y', w7y: '7Y', w10y: '10Y',
};

type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const GRANULARITIES: { value: Granularity; label: string; days: number }[] = [
  { value: 'daily',     label: 'Daily',     days: 1   },
  { value: 'weekly',    label: 'Weekly',    days: 7   },
  { value: 'monthly',   label: 'Monthly',   days: 30  },
  { value: 'quarterly', label: 'Quarterly', days: 90  },
  { value: 'yearly',    label: 'Yearly',    days: 365 },
];

/** Pick one point per N-day bucket (the first point in each bucket) */
function sample(points: RollingPoint[], days: number): RollingPoint[] {
  if (days <= 1) return points;
  const bucketMs = days * 24 * 60 * 60 * 1000;
  const seen = new Set<number>();
  return points.filter(p => {
    const bucket = Math.floor(p.date.getTime() / bucketMs);
    if (seen.has(bucket)) return false;
    seen.add(bucket);
    return true;
  });
}

interface RollingChartProps {
  series: { key: string; label: string; points: RollingPoint[] }[];
  activeKeys: string[];
}

interface ChartRow { ts: number; [k: string]: number }

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

interface Meta { endTs: number; startNav: number; endNav: number }
const metaMap = new Map<string, Meta>();

export function RollingChart({ series, activeKeys }: RollingChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const days = GRANULARITIES.find(g => g.value === granularity)!.days;

  metaMap.clear();
  const byTs = new Map<number, ChartRow>();
  for (const { key, points } of series) {
    if (!activeKeys.includes(key)) continue;
    const sampled = sample(points, days);
    for (const p of sampled) {
      const ts = p.endDate.getTime(); // X-axis = end of window (exit date)
      if (!byTs.has(ts)) byTs.set(ts, { ts });
      byTs.get(ts)![key] = +p.return.toFixed(2);
      metaMap.set(`${ts}_${key}`, { endTs: p.date.getTime(), startNav: p.startNav, endNav: p.endNav });
    }
  }

  const data = Array.from(byTs.values()).sort((a, b) => a.ts - b.ts);

  return (
    <div className="space-y-3">
      {/* Granularity selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Granularity:</span>
        {GRANULARITIES.map(g => (
          <button
            key={g.value}
            onClick={() => setGranularity(g.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border
              ${granularity === g.value
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}
          >
            {g.label}
          </button>
        ))}
        <span className="text-xs text-gray-600 ml-1">{data.length.toLocaleString()} points</span>
      </div>

      {/* Chart */}
      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="ts" type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={fmtDate}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false} scale="time"
            />
            <YAxis
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false} axisLine={false} width={56}
            />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af', fontSize: 12 }}
              formatter={(value: number, name: string, props: { payload?: ChartRow }) => {
                const ts = props?.payload?.ts;
                const meta = ts != null ? metaMap.get(`${ts}_${name}`) : undefined;
                return [
                  <span key="v" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{value > 0 ? '+' : ''}{value}%</span>
                    {meta && <>
                      <span style={{ color: '#9ca3af', fontSize: 11 }}>
                        {fmtDate(meta.endTs)} → {fmtDate(Number(ts))}
                      </span>
                      <span style={{ color: '#6b7280', fontSize: 11 }}>
                        NAV {meta.startNav.toFixed(4)} → {meta.endNav.toFixed(4)}
                      </span>
                    </>}
                  </span>,
                  `${KEY_LABELS[name] ?? name} Rolling`,
                ];
              }}
              labelFormatter={ts => `Exit: ${fmtDate(Number(ts))}`}
            />
            <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" />
            <Legend
              formatter={val => (
                <span style={{ color: KEY_COLORS[String(val)], fontSize: 12 }}>
                  {KEY_LABELS[String(val)] ?? val} Rolling
                </span>
              )}
            />
            {activeKeys.map(k => (
              <Line
                key={k} type="monotone" dataKey={k}
                stroke={KEY_COLORS[k] ?? '#888'}
                dot={false} strokeWidth={1.5} connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
