import { useState, useCallback } from 'react';
import { SearchBox, FundEntry } from './components/SearchBox';
import { RollingChart } from './components/RollingChart';
import { StatsPanel } from './components/StatsPanel';
import { fetchNAVHistory, FundMeta, NAVPoint } from './utils/mfApi';
import { computeRolling, computeStats, RollingPoint } from './utils/rollingReturns';

const WINDOWS = [1, 3, 5, 7, 10];
const WINDOW_LABELS: Record<number, string> = { 1: '1Y', 3: '3Y', 5: '5Y', 7: '7Y', 10: '10Y' };

interface Series { window: number; points: RollingPoint[] }

export default function App() {
  const [meta, setMeta] = useState<FundMeta | null>(null);
  const [nav, setNav] = useState<NAVPoint[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [activeWindows, setActiveWindows] = useState<number[]>([3, 5]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = useCallback(async (fund: FundEntry) => {
    setLoading(true);
    setError('');
    setMeta(null);
    setSeries([]);
    try {
      const { meta, nav } = await fetchNAVHistory(fund.c);
      setMeta(meta);
      setNav(nav);
      const computed = WINDOWS.map(w => ({ window: w, points: computeRolling(nav, w) }));
      setSeries(computed);
    } catch {
      setError('Failed to fetch NAV history. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  function toggleWindow(w: number) {
    setActiveWindows(prev =>
      prev.includes(w) ? (prev.length > 1 ? prev.filter(x => x !== w) : prev) : [...prev, w].sort((a, b) => a - b)
    );
  }

  const activeStats = activeWindows.length === 1
    ? computeStats(series.find(s => s.window === activeWindows[0])?.points ?? [])
    : null;

  const navSpan = nav.length >= 2
    ? `${nav[0].date.getFullYear()} – ${nav[nav.length - 1].date.getFullYear()}`
    : '';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              RR
            </div>
            <h1 className="text-lg font-semibold">MF Rolling Returns</h1>
            <span className="text-xs text-gray-500 ml-auto">Index updated weekly · NAV live from mfapi.in</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Search */}
        <div className="space-y-2">
          <p className="text-sm text-gray-500 text-center">
            Search from 75,000+ AMFI-registered funds
          </p>
          <SearchBox onSelect={handleSelect} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Fetching NAV history and computing rolling returns…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {!loading && meta && series.length > 0 && (
          <div className="space-y-6">

            {/* Fund header */}
            <div>
              <h2 className="text-xl font-semibold text-white">{meta.schemeName}</h2>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="text-sm text-gray-400">{meta.fundHouse}</span>
                {meta.schemeCategory && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    {meta.schemeCategory}
                  </span>
                )}
                {navSpan && (
                  <span className="text-xs text-gray-500">{navSpan} · {nav.length} data points</span>
                )}
              </div>
            </div>

            {/* Window toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 mr-1">Rolling window:</span>
              {WINDOWS.map(w => {
                const pts = series.find(s => s.window === w)?.points ?? [];
                const disabled = pts.length < 10;
                return (
                  <button
                    key={w}
                    onClick={() => !disabled && toggleWindow(w)}
                    disabled={disabled}
                    title={disabled ? 'Not enough data for this window' : ''}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border
                      ${disabled
                        ? 'opacity-30 cursor-not-allowed border-gray-700 text-gray-600'
                        : activeWindows.includes(w)
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                      }`}
                  >
                    {WINDOW_LABELS[w]}
                    {!disabled && (
                      <span className="ml-1.5 text-xs opacity-60">({pts.length})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-4">
                Each point = CAGR of ₹1 lakh invested on that date for the selected window period
              </p>
              <RollingChart series={series} activeWindows={activeWindows} />
            </div>

            {/* Stats — shown when exactly one window selected */}
            {activeWindows.length === 1 && activeStats && (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Statistics for <span className="text-white font-medium">{WINDOW_LABELS[activeWindows[0]]}</span> rolling returns
                  across <span className="text-white font-medium">{activeStats.count.toLocaleString()}</span> periods
                </p>
                <StatsPanel windowYears={activeWindows[0]} stats={activeStats} />
              </div>
            )}

            {/* Multi-window hint */}
            {activeWindows.length > 1 && (
              <p className="text-xs text-gray-500 text-center">
                Select a single window to see detailed statistics
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !meta && !error && (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">📈</div>
            <p className="text-gray-400">Search for a fund to see its rolling return history</p>
            <p className="text-sm text-gray-600">
              Rolling returns show how a fund would have performed for every possible start date — a far more honest measure than point-to-point returns
            </p>
          </div>
        )}

      </main>

      <footer className="border-t border-gray-800 px-4 py-4 mt-12">
        <p className="text-center text-xs text-gray-600">
          Fund index from AMFI · NAV data from mfapi.in · Updated weekly via GitHub Actions
        </p>
      </footer>
    </div>
  );
}
