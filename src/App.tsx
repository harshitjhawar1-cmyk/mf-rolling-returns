import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchBox, FundEntry } from './components/SearchBox';
import { RollingChart } from './components/RollingChart';
import { StatsPanel } from './components/StatsPanel';
import { fetchNAVHistory, FundMeta, NAVPoint } from './utils/mfApi';
import { computeRolling, computeStats, RollingPoint } from './utils/rollingReturns';

interface Window { years: number; label: string; key: string; defaultActive?: boolean }
const WINDOWS: Window[] = [
  { years: 1/12,  label: '1M',  key: 'w1m'  },
  { years: 3/12,  label: '3M',  key: 'w3m'  },
  { years: 6/12,  label: '6M',  key: 'w6m'  },
  { years: 1,     label: '1Y',  key: 'w1y'  },
  { years: 3,     label: '3Y',  key: 'w3y', defaultActive: true },
  { years: 5,     label: '5Y',  key: 'w5y', defaultActive: true },
  { years: 7,     label: '7Y',  key: 'w7y'  },
  { years: 10,    label: '10Y', key: 'w10y' },
];

interface Series { key: string; label: string; points: RollingPoint[] }

export default function App() {
  const [meta, setMeta]     = useState<FundMeta | null>(null);
  const [nav, setNav]       = useState<NAVPoint[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [activeKeys, setActiveKeys] = useState<string[]>(
    WINDOWS.filter(w => w.defaultActive).map(w => w.key)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [mounted, setMounted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const handleSelect = useCallback(async (fund: FundEntry) => {
    setLoading(true); setError(''); setMeta(null); setSeries([]);
    try {
      const { meta, nav } = await fetchNAVHistory(fund.c);
      setMeta(meta); setNav(nav);
      setSeries(WINDOWS.map(w => ({ key: w.key, label: w.label, points: computeRolling(nav, w.years) })));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch { setError('Could not fetch NAV data. Please try again.'); }
    finally { setLoading(false); }
  }, []);

  function toggleWindow(key: string) {
    setActiveKeys(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    );
  }

  const activeWindow = activeKeys.length === 1 ? WINDOWS.find(w => w.key === activeKeys[0]) : null;
  const activeStats  = activeWindow ? computeStats(series.find(s => s.key === activeWindow.key)?.points ?? []) : null;
  const navSpan      = nav.length >= 2 ? `${nav[0].date.getFullYear()}–${nav[nav.length-1].date.getFullYear()}` : '';
  const hasResult    = !loading && !!meta && series.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

        :root {
          --bg:        #080c14;
          --bg2:       #0d1220;
          --surface:   #111827;
          --surface2:  #161f30;
          --border:    rgba(255,255,255,.07);
          --border2:   rgba(255,255,255,.12);
          --indigo:    #6366f1;
          --indigo-lt: #818cf8;
          --indigo-glow: rgba(99,102,241,.2);
          --cyan:      #22d3ee;
          --green:     #34d399;
          --amber:     #fbbf24;
          --red:       #f87171;
          --txt:       #e2e8f5;
          --txt2:      #94a3b8;
          --txt3:      #475569;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--txt); font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }

        .display { font-family: 'Bricolage Grotesque', sans-serif; }
        .mono    { font-family: 'Fira Code', monospace; }

        /* animations */
        @keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin     { to { transform:rotate(360deg) } }
        @keyframes pulse-glow { 0%,100%{opacity:.5} 50%{opacity:1} }

        .anim-1 { animation: fadeUp .6s ease both .05s }
        .anim-2 { animation: fadeUp .6s ease both .15s }
        .anim-3 { animation: fadeUp .6s ease both .25s }
        .anim-4 { animation: fadeUp .6s ease both .35s }
        .anim-5 { animation: fadeUp .6s ease both .45s }

        /* window pill */
        .win-pill {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--border2);
          color: var(--txt2);
          background: transparent;
          cursor: pointer;
          transition: all .15s;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .win-pill:hover:not(:disabled)  { border-color: var(--indigo-lt); color: var(--txt); background: rgba(99,102,241,.1); }
        .win-pill.on  { background: var(--indigo); border-color: var(--indigo); color: #fff; font-weight: 600; }
        .win-pill:disabled { opacity: .25; cursor: not-allowed; }

        /* feature card */
        .feat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 28px;
          transition: border-color .2s, transform .2s;
        }
        .feat-card:hover { border-color: var(--border2); transform: translateY(-2px); }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(8,12,20,.85)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--indigo), var(--cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <span className="display" style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-.01em' }}>Rolling Returns</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)' }}>14k+ funds · live NAV</span>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 999,
            background: 'rgba(99,102,241,.15)', color: 'var(--indigo-lt)',
            border: '1px solid rgba(99,102,241,.3)', fontWeight: 600,
          }}>Free</span>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px 80px' }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400,
          background: 'radial-gradient(ellipse, rgba(99,102,241,.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,.015) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative' }}>

          {/* Eyebrow */}
          <div className="anim-1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)',
            borderRadius: 999, padding: '5px 14px', marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo-lt)', animation: 'pulse-glow 2s ease infinite' }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--indigo-lt)', letterSpacing: '.06em' }}>
              honest fund evaluation
            </span>
          </div>

          {/* Headline */}
          <h1 className="display anim-2" style={{
            fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
            fontWeight: 800, lineHeight: 1.08,
            letterSpacing: '-.04em',
            marginBottom: 20,
          }}>
            Stop trusting<br/>
            <span style={{
              background: 'linear-gradient(90deg, var(--indigo-lt), var(--cyan))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>point-to-point returns</span>
          </h1>

          {/* Sub */}
          <p className="anim-3" style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: 'var(--txt2)', lineHeight: 1.75,
            fontWeight: 300, marginBottom: 44, maxWidth: 560, margin: '0 auto 44px',
          }}>
            Any fund can look great with the right start date. Rolling returns show you the <strong style={{ color: 'var(--txt)', fontWeight: 600 }}>real distribution</strong> — every possible entry point, all at once.
          </p>

          {/* ── SEARCH ─────────────────────────────────────────── */}
          <div className="anim-4" style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: 16,
              padding: 6,
              boxShadow: '0 0 0 1px rgba(99,102,241,.1), 0 20px 60px rgba(0,0,0,.4)',
            }}>
              <SearchBox onSelect={handleSelect} />
            </div>
            <p className="mono" style={{ marginTop: 12, fontSize: 11, color: 'var(--txt3)', textAlign: 'center' }}>
              No signup · No ads · Always free
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="anim-5" style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40,
                border: '2px solid rgba(99,102,241,.3)',
                borderTopColor: 'var(--indigo)',
                borderRadius: '50%',
                animation: 'spin .8s linear infinite',
              }} />
              <p className="mono" style={{ fontSize: 12, color: 'var(--txt3)' }}>
                Fetching NAV history · computing rolling returns…
              </p>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 24,
              background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
              borderRadius: 12, padding: '12px 20px', fontSize: 13, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}
        </div>
      </section>

      {/* ── RESULTS ─────────────────────────────────────────────────── */}
      {hasResult && (
        <section ref={resultsRef} style={{ maxWidth: 1140, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(99,102,241,.08), 0 24px 80px rgba(0,0,0,.5)',
          }}>
            {/* Fund header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%)',
            }}>
              <h2 className="display" style={{ fontSize: 'clamp(.95rem, 2vw, 1.25rem)', fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.35, marginBottom: 10 }}>
                {meta!.schemeName}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--txt2)' }}>{meta!.fundHouse}</span>
                {meta!.schemeCategory && (
                  <span style={{
                    fontSize: 11, padding: '2px 10px', borderRadius: 6,
                    background: 'rgba(99,102,241,.12)', color: 'var(--indigo-lt)',
                    border: '1px solid rgba(99,102,241,.25)', fontWeight: 600,
                  }}>{meta!.schemeCategory}</span>
                )}
                {navSpan && (
                  <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)' }}>
                    {navSpan} · {nav.length.toLocaleString()} data points
                  </span>
                )}
              </div>
            </div>

            {/* Window selector */}
            <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)', marginRight: 4 }}>Rolling window</span>
              {WINDOWS.map(w => {
                const pts = series.find(s => s.key === w.key)?.points ?? [];
                const disabled = pts.length < 10;
                return (
                  <button
                    key={w.key}
                    className={`win-pill ${activeKeys.includes(w.key) ? 'on' : ''}`}
                    onClick={() => !disabled && toggleWindow(w.key)}
                    disabled={disabled}
                    title={disabled ? 'Not enough history' : `${pts.length} periods`}
                  >
                    {w.label}
                    {!disabled && <span style={{ fontSize: 10, opacity: .55 }}>{pts.length}</span>}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            <div style={{ padding: '24px 32px 20px' }}>
              <p className="mono" style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 16 }}>
                X-axis = exit date · each point = annualised CAGR of ₹1 lakh held for the selected window ending on that date
              </p>
              <RollingChart series={series} activeKeys={activeKeys} />
            </div>

            {/* Stats */}
            {activeKeys.length === 1 && activeStats && activeWindow && (
              <div style={{ padding: '0 32px 32px' }}>
                <p className="mono" style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 14 }}>
                  {activeWindow.label} rolling stats across {activeStats.count.toLocaleString()} periods
                </p>
                <StatsPanel windowLabel={activeWindow.label} stats={activeStats} />
              </div>
            )}
            {activeKeys.length > 1 && (
              <p className="mono" style={{ textAlign: 'center', fontSize: 11, color: 'var(--txt3)', paddingBottom: 28 }}>
                Select a single window to see statistics
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── FEATURES (shown before search result) ────────────────────── */}
      {!hasResult && !loading && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 100px' }}>

          {/* Pain points grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 72 }}>
            {[
              {
                icon: '📊',
                color: 'var(--red)',
                title: '"Top performing fund" means nothing',
                body: 'Every fund can claim top performance — just pick the right 3-year window. The same fund might have returned -6% if you started a year earlier.',
              },
              {
                icon: '📅',
                color: 'var(--amber)',
                title: 'Timing risk is real and hidden',
                body: 'Two investors in the same fund with 2-year gap can have wildly different outcomes. Point-to-point returns hide this completely.',
              },
              {
                icon: '📈',
                color: 'var(--green)',
                title: 'Rolling returns show the full picture',
                body: 'Every dot on the chart is a different entry date. You see best case, worst case, and median — all at once, no cherry-picking.',
              },
            ].map((f, i) => (
              <div key={i} className="feat-card">
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `rgba(from ${f.color} r g b / 0.12)`,
                  border: `1px solid rgba(from ${f.color} r g b / 0.25)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, marginBottom: 18,
                }}>
                  {f.icon}
                </div>
                <h3 className="display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, lineHeight: 1.4, letterSpacing: '-.01em' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--txt2)', lineHeight: 1.75 }}>{f.body}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20, padding: '48px 40px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 240, height: 240,
              background: 'radial-gradient(circle, rgba(99,102,241,.12), transparent 70%)',
              pointerEvents: 'none',
            }} />

            <h2 className="display" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: 40 }}>
              How it works
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40 }}>
              {[
                { n: '01', title: 'Search your fund', body: '14,000+ AMFI-registered funds indexed weekly from the official NAVAll feed.' },
                { n: '02', title: 'Pick your window', body: 'Choose 1M to 10Y rolling period. Select multiple windows to compare consistency.' },
                { n: '03', title: 'Read the truth', body: 'Every point on the chart = a different entry date. Best, worst, median returns laid bare.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span className="display mono" style={{
                    fontSize: 13, fontWeight: 700,
                    color: 'var(--indigo-lt)',
                    letterSpacing: '.1em',
                  }}>{s.n}</span>
                  <div style={{ height: 1, background: 'linear-gradient(90deg, var(--indigo), transparent)', width: '60%' }} />
                  <h3 className="display" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.75 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust bar */}
          <div style={{
            marginTop: 48,
            display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', alignItems: 'center',
          }}>
            {[
              { label: 'Data source', value: 'AMFI India' },
              { label: 'NAV feed', value: 'mfapi.in' },
              { label: 'Index updated', value: 'Every Monday' },
              { label: 'Funds indexed', value: '14,000+' },
              { label: 'Cost', value: 'Free forever' },
            ].map(t => (
              <div key={t.label} style={{ textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>{t.value}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--txt3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', textAlign: 'center' }}>
        <p className="mono" style={{ fontSize: 11, color: 'var(--txt3)' }}>
          Rolling Returns · Fund index from AMFI · NAV data from mfapi.in · Rebuilt weekly via GitHub Actions
        </p>
      </footer>
    </>
  );
}
