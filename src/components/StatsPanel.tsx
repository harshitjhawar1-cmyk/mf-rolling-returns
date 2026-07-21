import { RollingStats } from '../utils/rollingReturns';

interface StatsPanelProps {
  windowLabel: string;
  stats: RollingStats;
}

function fmt(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function color(n: number) {
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

export function StatsPanel({ windowLabel, stats }: StatsPanelProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[
        { label: 'Best', value: stats.max, colored: true },
        { label: 'Worst', value: stats.min, colored: true },
        { label: 'Median', value: stats.median, colored: true },
        { label: 'Average', value: stats.mean, colored: true },
        { label: '% Positive Periods', value: stats.positivePct, suffix: '%', special: true },
      ].map(({ label, value, colored, special }) => (
        <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
          <div className={`text-xl font-bold tabular-nums ${special ? (value >= 90 ? 'text-green-400' : value >= 70 ? 'text-yellow-400' : 'text-red-400') : colored ? color(value) : 'text-white'}`}>
            {special ? value.toFixed(1) + '%' : fmt(value)}
          </div>
          {!special && <div className="text-xs text-gray-600 mt-0.5">{windowLabel} {['1M','3M','6M'].includes(windowLabel) ? 'absolute' : 'CAGR'}</div>}
        </div>
      ))}
    </div>
  );
}
