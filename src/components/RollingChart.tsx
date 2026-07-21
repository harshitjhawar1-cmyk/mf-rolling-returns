import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { RollingPoint } from '../utils/rollingReturns';

const WINDOW_COLORS: Record<number, string> = {
  1:  '#60a5fa',
  3:  '#34d399',
  5:  '#f59e0b',
  7:  '#a78bfa',
  10: '#f87171',
};

interface RollingChartProps {
  series: { window: number; points: RollingPoint[] }[];
  activeWindows: number[];
}

interface ChartRow {
  ts: number;
  label: string;
  [key: string]: number | string;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function RollingChart({ series, activeWindows }: RollingChartProps) {
  // Merge all series into one array keyed by timestamp
  const byTs = new Map<number, ChartRow>();
  for (const { window, points } of series) {
    if (!activeWindows.includes(window)) continue;
    for (const p of points) {
      const ts = p.date.getTime();
      if (!byTs.has(ts)) byTs.set(ts, { ts, label: fmtDate(ts) });
      (byTs.get(ts)!)[`w${window}`] = +p.return.toFixed(2);
    }
  }

  const data = Array.from(byTs.values()).sort((a, b) => a.ts - b.ts);

  return (
    <div className="w-full h-80 sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtDate}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            scale="time"
          />
          <YAxis
            tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af', fontSize: 12 }}
            formatter={(value: number, name: string) => {
              const w = name.replace('w', '');
              return [`${value > 0 ? '+' : ''}${value}%`, `${w}Y Rolling CAGR`];
            }}
            labelFormatter={ts => fmtDate(Number(ts))}
          />
          <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4" />
          <Legend
            formatter={(val) => {
              const w = String(val).replace('w', '');
              return <span style={{ color: WINDOW_COLORS[+w], fontSize: 12 }}>{w}Y Rolling</span>;
            }}
          />
          {activeWindows.map(w => (
            <Line
              key={w}
              type="monotone"
              dataKey={`w${w}`}
              stroke={WINDOW_COLORS[w]}
              dot={false}
              strokeWidth={1.5}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
