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

interface RollingChartProps {
  series: { key: string; label: string; points: RollingPoint[] }[];
  activeKeys: string[];
}

interface ChartRow { ts: number; [k: string]: number }

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// Store end-dates per (ts, key) for tooltip
const endDateMap = new Map<string, number>();

export function RollingChart({ series, activeKeys }: RollingChartProps) {
  endDateMap.clear();
  const byTs = new Map<number, ChartRow>();
  for (const { key, points } of series) {
    if (!activeKeys.includes(key)) continue;
    for (const p of points) {
      const ts = p.date.getTime();
      if (!byTs.has(ts)) byTs.set(ts, { ts });
      byTs.get(ts)![key] = +p.return.toFixed(2);
      endDateMap.set(`${ts}_${key}`, p.endDate.getTime());
    }
  }

  const data = Array.from(byTs.values()).sort((a, b) => a.ts - b.ts);

  return (
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
              const endTs = ts != null ? endDateMap.get(`${ts}_${name}`) : undefined;
              const range = endTs != null
                ? `${fmtDate(Number(ts))} → ${fmtDate(endTs)}`
                : fmtDate(Number(ts));
              return [
                <span key="v">
                  <span style={{ fontWeight: 600 }}>{value > 0 ? '+' : ''}{value}%</span>
                  <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 6 }}>{range}</span>
                </span>,
                `${KEY_LABELS[name] ?? name} Rolling`,
              ];
            }}
            labelFormatter={ts => fmtDate(Number(ts))}
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
  );
}
