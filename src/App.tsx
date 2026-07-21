import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchBox, FundEntry } from './components/SearchBox';
import { RollingChart } from './components/RollingChart';
import { StatsPanel } from './components/StatsPanel';
import { RollingTable } from './components/RollingTable';
import { fetchNAVHistory, FundMeta, NAVPoint } from './utils/mfApi';
import { computeRolling, computeStats, RollingPoint } from './utils/rollingReturns';

interface WindowDef { years: number; label: string; key: string; defaultActive?: boolean }
const WINDOWS: WindowDef[] = [
  { years: 1/12, label: '1M',  key: 'w1m' },
  { years: 3/12, label: '3M',  key: 'w3m' },
  { years: 6/12, label: '6M',  key: 'w6m' },
  { years: 1,    label: '1Y',  key: 'w1y' },
  { years: 3,    label: '3Y',  key: 'w3y', defaultActive: true },
  { years: 5,    label: '5Y',  key: 'w5y', defaultActive: true },
  { years: 7,    label: '7Y',  key: 'w7y' },
  { years: 10,   label: '10Y', key: 'w10y' },
];

const FUND_COLORS = ['#6366f1','#34d399','#f59e0b','#f87171','#22d3ee','#a78bfa'];
const MAX_FUNDS   = 6;

export interface FundData {
  fund:    FundEntry;
  meta:    FundMeta | null;
  nav:     NAVPoint[];
  series:  { key: string; label: string; points: RollingPoint[] }[];
  color:   string;
  loading: boolean;
  error:   string;
}

export default function App() {
  const [funds, setFunds]         = useState<FundData[]>([]);
  const [activeKeys, setActiveKeys] = useState<string[]>(
    WINDOWS.filter(w => w.defaultActive).map(w => w.key)
  );
  // In compare mode, lock to one window
  const [compareWindow, setCompareWindow] = useState<string>('w3y');
  const [mounted, setMounted]     = useState(false);
  const resultsRef                = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const isCompare = funds.length > 1;

  const addFund = useCallback(async (entry: FundEntry) => {
    if (funds.some(f => f.fund.c === entry.c)) return;
    if (funds.length >= MAX_FUNDS) return;

    const color = FUND_COLORS[funds.length % FUND_COLORS.length];
    const placeholder: FundData = { fund: entry, meta: null, nav: [], series: [], color, loading: true, error: '' };
    setFunds(prev => [...prev, placeholder]);

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);

    try {
      const { meta, nav } = await fetchNAVHistory(entry.c);
      const series = WINDOWS.map(w => ({ key: w.key, label: w.label, points: computeRolling(nav, w.years) }));
      setFunds(prev => prev.map(f => f.fund.c === entry.c ? { ...f, meta, nav, series, loading: false } : f));
    } catch {
      setFunds(prev => prev.map(f => f.fund.c === entry.c ? { ...f, loading: false, error: 'Failed to fetch NAV data.' } : f));
    }
  }, [funds]);

  function removeFund(code: number) {
    setFunds(prev => prev.filter(f => f.fund.c !== code));
  }

  function toggleWindow(key: string) {
    if (isCompare) { setCompareWindow(key); return; }
    setActiveKeys(prev => prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]);
  }

  const activeSingleFund  = !isCompare && funds[0];
  const singleActiveWin   = !isCompare && activeKeys.length === 1 ? WINDOWS.find(w => w.key === activeKeys[0]) : null;
  const singleActiveStats = singleActiveWin && activeSingleFund
    ? computeStats(activeSingleFund.series.find(s => s.key === singleActiveWin.key)?.points ?? [])
    : null;
  const navSpan = (fd: FundData) => fd.nav.length >= 2
    ? `${fd.nav[0].date.getFullYear()}–${fd.nav[fd.nav.length-1].date.getFullYear()}`
    : '';

  const addedCodes = funds.map(f => f.fund.c);
  const hasAnyResult = funds.some(f => !f.loading && f.series.length > 0);

  // Which keys are currently active on the chart
  const chartActiveKeys = isCompare ? [compareWindow] : activeKeys;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');
        :root {
          --bg:#080c14; --bg2:#0d1220; --surface:#111827; --surface2:#161f30;
          --border:rgba(255,255,255,.07); --border2:rgba(255,255,255,.12);
          --indigo:#6366f1; --indigo-lt:#818cf8; --indigo-glow:rgba(99,102,241,.2);
          --cyan:#22d3ee; --green:#34d399; --amber:#fbbf24; --red:#f87171;
          --txt:#e2e8f5; --txt2:#94a3b8; --txt3:#475569;
        }
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        body { background:var(--bg); color:var(--txt); font-family:'Plus Jakarta Sans',sans-serif; -webkit-font-smoothing:antialiased; }
        .display { font-family:'Bricolage Grotesque',sans-serif; }
        .mono    { font-family:'Fira Code',monospace; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse-glow { 0%,100%{opacity:.5} 50%{opacity:1} }
        .anim-1 { animation:fadeUp .6s ease both .05s }
        .anim-2 { animation:fadeUp .6s ease both .15s }
        .anim-3 { animation:fadeUp .6s ease both .25s }
        .anim-4 { animation:fadeUp .6s ease both .35s }
        .win-pill {
          padding:6px 14px; border-radius:8px; font-size:13px; font-weight:500;
          border:1px solid var(--border2); color:var(--txt2); background:transparent;
          cursor:pointer; transition:all .15s; font-family:'Plus Jakarta Sans',sans-serif;
          display:inline-flex; align-items:center; gap:5px;
        }
        .win-pill:hover:not(:disabled) { border-color:var(--indigo-lt); color:var(--txt); background:rgba(99,102,241,.1); }
        .win-pill.on  { background:var(--indigo); border-color:var(--indigo); color:#fff; font-weight:600; }
        .win-pill:disabled { opacity:.25; cursor:not-allowed; }
        .feat-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:28px; transition:border-color .2s,transform .2s; }
        .feat-card:hover { border-color:var(--border2); transform:translateY(-2px); }
        .fund-chip {
          display:inline-flex; align-items:center; gap:8px;
          padding:6px 12px; border-radius:999px;
          border:1px solid; font-size:12px; font-weight:500;
          transition:all .15s;
        }
      `}</style>

      {/* NAV */}
      <header style={{ position:'sticky', top:0, zIndex:50, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', background:'rgba(8,12,20,.85)', borderBottom:'1px solid var(--border)', padding:'0 32px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,var(--indigo),var(--cyan))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span className="display" style={{ fontWeight:700, fontSize:14, letterSpacing:'-.01em' }}>Rolling Returns</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <span className="mono" style={{ fontSize:11, color:'var(--txt3)' }}>14k+ funds · live NAV</span>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:999, background:'rgba(99,102,241,.15)', color:'var(--indigo-lt)', border:'1px solid rgba(99,102,241,.3)', fontWeight:600 }}>Free</span>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position:'relative', overflow:'hidden', padding:'100px 24px 80px' }}>
        <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:700, height:400, background:'radial-gradient(ellipse,rgba(99,102,241,.15) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundImage:'radial-gradient(circle at 20px 20px,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />

        <div style={{ maxWidth:720, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <div className="anim-1" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(99,102,241,.12)', border:'1px solid rgba(99,102,241,.3)', borderRadius:999, padding:'5px 14px', marginBottom:28 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--indigo-lt)', animation:'pulse-glow 2s ease infinite' }} />
            <span className="mono" style={{ fontSize:11, color:'var(--indigo-lt)', letterSpacing:'.06em' }}>honest fund evaluation</span>
          </div>

          <h1 className="display anim-2" style={{ fontSize:'clamp(2.4rem,6vw,4.2rem)', fontWeight:800, lineHeight:1.08, letterSpacing:'-.04em', marginBottom:20 }}>
            Stop trusting<br/>
            <span style={{ background:'linear-gradient(90deg,var(--indigo-lt),var(--cyan))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>point-to-point returns</span>
          </h1>

          <p className="anim-3" style={{ fontSize:'clamp(1rem,2vw,1.15rem)', color:'var(--txt2)', lineHeight:1.75, fontWeight:300, marginBottom:44, maxWidth:560, margin:'0 auto 44px' }}>
            Any fund can look great with the right start date. Rolling returns show the <strong style={{ color:'var(--txt)', fontWeight:600 }}>real distribution</strong> — every possible entry point. Compare up to {MAX_FUNDS} funds side by side.
          </p>

          {/* SEARCH */}
          <div className="anim-4" style={{ maxWidth:600, margin:'0 auto' }}>
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:16, padding:6, boxShadow:'0 0 0 1px rgba(99,102,241,.1),0 20px 60px rgba(0,0,0,.4)' }}>
              <SearchBox
                onSelect={addFund}
                addedCodes={addedCodes}
                placeholder={funds.length === 0 ? 'Search a fund to get started…' : `Add another fund to compare (${funds.length}/${MAX_FUNDS})…`}
              />
            </div>

            {/* Fund chips */}
            {funds.length > 0 && (
              <div style={{ marginTop:16, display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
                {funds.map(fd => (
                  <div key={fd.fund.c} className="fund-chip" style={{ borderColor: fd.color + '55', background: fd.color + '18', color: fd.color }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:fd.color, flexShrink:0 }} />
                    <span style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--txt)' }}>
                      {fd.fund.n.split(' - ')[0].split(' Direct')[0].split(' Regular')[0].trim()}
                    </span>
                    {fd.loading && <span style={{ width:12, height:12, border:`2px solid ${fd.color}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />}
                    <button onClick={() => removeFund(fd.fund.c)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--txt3)', padding:'0 2px', fontSize:14, lineHeight:1, display:'flex', alignItems:'center' }} title="Remove">✕</button>
                  </div>
                ))}
                {funds.length < MAX_FUNDS && (
                  <div style={{ fontSize:12, color:'var(--txt3)', display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ opacity:.5 }}>+</span> search to add more
                  </div>
                )}
              </div>
            )}

            <p className="mono" style={{ marginTop:12, fontSize:11, color:'var(--txt3)', textAlign:'center' }}>
              No signup · No ads · Always free
            </p>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      {hasAnyResult && (
        <section ref={resultsRef} style={{ maxWidth:1140, margin:'0 auto 80px', padding:'0 24px' }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, overflow:'hidden', boxShadow:'0 0 0 1px rgba(99,102,241,.08),0 24px 80px rgba(0,0,0,.5)' }}>

            {/* Fund headers */}
            {funds.map(fd => fd.meta && (
              <div key={fd.fund.c} style={{ padding:'20px 32px', borderBottom:'1px solid var(--border)', background:'linear-gradient(180deg,var(--surface2) 0%,var(--surface) 100%)', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:12, height:12, borderRadius:'50%', background:fd.color, flexShrink:0, marginTop:5 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <h2 className="display" style={{ fontSize:'clamp(.9rem,2vw,1.15rem)', fontWeight:700, letterSpacing:'-.02em', lineHeight:1.35, marginBottom:6, color:fd.color }}>
                    {fd.meta.schemeName}
                  </h2>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'var(--txt2)' }}>{fd.meta.fundHouse}</span>
                    {fd.meta.schemeCategory && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:`${fd.color}20`, color:fd.color, border:`1px solid ${fd.color}40`, fontWeight:600 }}>{fd.meta.schemeCategory}</span>}
                    {navSpan(fd) && <span className="mono" style={{ fontSize:11, color:'var(--txt3)' }}>{navSpan(fd)} · {fd.nav.length.toLocaleString()} pts</span>}
                  </div>
                </div>
                <button onClick={() => removeFund(fd.fund.c)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--txt3)', padding:'6px 10px', fontSize:12, transition:'all .15s', flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#f87171'; e.currentTarget.style.color='#f87171'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--txt3)'; }}>
                  Remove
                </button>
              </div>
            ))}

            {/* Window selector */}
            <div style={{ padding:'16px 32px', borderBottom:'1px solid var(--border)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <span className="mono" style={{ fontSize:11, color:'var(--txt3)', marginRight:4 }}>
                {isCompare ? 'Compare window' : 'Rolling window'}
              </span>
              {WINDOWS.map(w => {
                // In compare mode: any of the loaded funds needs data for this window
                const hasPts = isCompare
                  ? funds.some(fd => (fd.series.find(s => s.key === w.key)?.points.length ?? 0) >= 10)
                  : (funds[0]?.series.find(s => s.key === w.key)?.points.length ?? 0) >= 10;
                const isActive = isCompare ? compareWindow === w.key : activeKeys.includes(w.key);
                return (
                  <button key={w.key} className={`win-pill ${isActive ? 'on' : ''}`}
                    onClick={() => hasPts && toggleWindow(w.key)}
                    disabled={!hasPts}>
                    {w.label}
                  </button>
                );
              })}
              {isCompare && <span className="mono" style={{ fontSize:11, color:'var(--txt3)', marginLeft:4, opacity:.6 }}>one window at a time in compare mode</span>}

              {/* Add fund shortcut inside chart */}
              {funds.length < MAX_FUNDS && (
                <button
                  style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'1px dashed rgba(99,102,241,.4)', background:'rgba(99,102,241,.08)', color:'var(--indigo-lt)', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--indigo)'; e.currentTarget.style.background='rgba(99,102,241,.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(99,102,241,.4)'; e.currentTarget.style.background='rgba(99,102,241,.08)'; }}
                  onClick={() => globalThis.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <span style={{ fontSize:16 }}>+</span> Add fund to compare
                </button>
              )}
            </div>

            {/* Chart */}
            <div style={{ padding:'24px 32px 20px' }}>
              <p className="mono" style={{ fontSize:11, color:'var(--txt3)', marginBottom:16 }}>
                X-axis = exit date · 1M/3M/6M = absolute return · 1Y+ = annualised CAGR
              </p>
              <RollingChart
                funds={funds}
                activeKeys={chartActiveKeys}
                isCompare={isCompare}
              />
            </div>

            {/* Stats — single fund, single window only */}
            {!isCompare && singleActiveWin && singleActiveStats && (
              <div style={{ padding:'0 32px 32px' }}>
                <p className="mono" style={{ fontSize:11, color:'var(--txt3)', marginBottom:14 }}>
                  {singleActiveWin.label} rolling stats across {singleActiveStats.count.toLocaleString()} periods
                </p>
                <StatsPanel windowLabel={singleActiveWin.label} stats={singleActiveStats} />
              </div>
            )}
            {!isCompare && activeKeys.length > 1 && (
              <p className="mono" style={{ textAlign:'center', fontSize:11, color:'var(--txt3)', paddingBottom:28 }}>
                Select a single window to see statistics
              </p>
            )}

            {/* Compare stats table */}
            {isCompare && (
              <div style={{ padding:'0 32px 32px' }}>
                <p className="mono" style={{ fontSize:11, color:'var(--txt3)', marginBottom:16 }}>
                  {WINDOWS.find(w => w.key === compareWindow)?.label} rolling stats comparison
                </p>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Fund','Best','Worst','Median','Avg','% Positive'].map(h => (
                          <th key={h} style={{ padding:'8px 12px', textAlign: h === 'Fund' ? 'left' : 'right', color:'var(--txt3)', fontWeight:500, fontSize:11, fontFamily:'Fira Code' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {funds.map(fd => {
                        const pts = fd.series.find(s => s.key === compareWindow)?.points ?? [];
                        const st  = computeStats(pts);
                        const shortName = fd.fund.n.split(' - ')[0].split(' Direct')[0].split(' Regular')[0].trim();
                        const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
                        const col = (n: number) => n >= 0 ? '#34d399' : '#f87171';
                        return (
                          <tr key={fd.fund.c} style={{ borderBottom:'1px solid var(--border)' }}>
                            <td style={{ padding:'10px 12px', textAlign:'left' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ width:10, height:10, borderRadius:'50%', background:fd.color, flexShrink:0 }} />
                                <span style={{ color:'var(--txt)', fontWeight:500, fontSize:13, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shortName}</span>
                              </div>
                            </td>
                            {st ? (
                              <>
                                <td style={{ padding:'10px 12px', textAlign:'right', color:col(st.max),  fontWeight:600, fontFamily:'Fira Code', fontSize:13 }}>{fmt(st.max)}</td>
                                <td style={{ padding:'10px 12px', textAlign:'right', color:col(st.min),  fontWeight:600, fontFamily:'Fira Code', fontSize:13 }}>{fmt(st.min)}</td>
                                <td style={{ padding:'10px 12px', textAlign:'right', color:col(st.median), fontFamily:'Fira Code', fontSize:13 }}>{fmt(st.median)}</td>
                                <td style={{ padding:'10px 12px', textAlign:'right', color:col(st.mean), fontFamily:'Fira Code', fontSize:13 }}>{fmt(st.mean)}</td>
                                <td style={{ padding:'10px 12px', textAlign:'right', color: st.positivePct >= 80 ? '#34d399' : st.positivePct >= 60 ? '#fbbf24' : '#f87171', fontWeight:600, fontFamily:'Fira Code', fontSize:13 }}>{st.positivePct.toFixed(1)}%</td>
                              </>
                            ) : (
                              <td colSpan={5} style={{ padding:'10px 12px', textAlign:'center', color:'var(--txt3)', fontFamily:'Fira Code', fontSize:12 }}>Not enough data</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* TABULAR ROLLING RETURNS VIEW */}
          <div style={{ marginTop:32, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:20, overflow:'hidden', boxShadow:'0 0 0 1px rgba(99,102,241,.08),0 24px 80px rgba(0,0,0,.5)' }}>
            <div style={{ padding:'20px 32px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--indigo-lt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
              <h3 className="display" style={{ fontSize:15, fontWeight:700, letterSpacing:'-.01em' }}>Rolling returns table</h3>
              <span className="mono" style={{ fontSize:11, color:'var(--txt3)', marginLeft:'auto' }}>full breakdown by period</span>
            </div>
            <div style={{ padding:'24px 32px 28px' }}>
              <RollingTable funds={funds} windows={WINDOWS} />
            </div>
          </div>
        </section>
      )}

      {/* LANDING (when no funds) */}
      {funds.length === 0 && (
        <section style={{ maxWidth:1100, margin:'0 auto', padding:'20px 24px 100px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:72 }}>
            {[
              { icon:'📊', color:'var(--red)',   title:'"Top performing fund" means nothing', body:'Every fund can claim top performance — just pick the right 3-year window. The same fund might have returned -6% if you started a year earlier.' },
              { icon:'📅', color:'var(--amber)',  title:'Timing risk is real and hidden', body:'Two investors in the same fund with a 2-year gap can have wildly different outcomes. Point-to-point returns hide this completely.' },
              { icon:'📈', color:'var(--green)',  title:'Rolling returns show the full picture', body:'Every dot on the chart is a different entry date. You see best case, worst case, and median — all at once, no cherry-picking.' },
            ].map((f, i) => (
              <div key={i} className="feat-card">
                <div style={{ fontSize:24, marginBottom:18 }}>{f.icon}</div>
                <h3 className="display" style={{ fontSize:15, fontWeight:700, marginBottom:10, lineHeight:1.4, letterSpacing:'-.01em' }}>{f.title}</h3>
                <p style={{ fontSize:13.5, color:'var(--txt2)', lineHeight:1.75 }}>{f.body}</p>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'48px 40px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, background:'radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)', pointerEvents:'none' }} />
            <h2 className="display" style={{ fontSize:'clamp(1.2rem,2.5vw,1.7rem)', fontWeight:800, letterSpacing:'-.03em', marginBottom:40 }}>How it works</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:40 }}>
              {[
                { n:'01', title:'Search your fund', body:'14,000+ AMFI-registered funds indexed weekly from the official NAVAll feed.' },
                { n:'02', title:'Pick your window', body:'Choose 1M to 10Y rolling period. Select multiple windows or compare multiple funds.' },
                { n:'03', title:'Read the truth', body:'Every point on the chart = a different entry date. Best, worst, median returns laid bare.' },
              ].map(s => (
                <div key={s.n} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <span className="mono" style={{ fontSize:13, fontWeight:700, color:'var(--indigo-lt)', letterSpacing:'.1em' }}>{s.n}</span>
                  <div style={{ height:1, background:'linear-gradient(90deg,var(--indigo),transparent)', width:'60%' }} />
                  <h3 className="display" style={{ fontSize:15, fontWeight:700, letterSpacing:'-.01em' }}>{s.title}</h3>
                  <p style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.75 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop:48, display:'flex', flexWrap:'wrap', gap:24, justifyContent:'center', alignItems:'center' }}>
            {[['AMFI India','Data source'],['mfapi.in','NAV feed'],['Every Monday','Index updated'],['14,000+','Funds indexed'],['Free forever','Cost']].map(([v,l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div className="mono" style={{ fontSize:13, fontWeight:600, color:'var(--txt)', marginBottom:2 }}>{v}</div>
                <div className="mono" style={{ fontSize:10, color:'var(--txt3)', letterSpacing:'.06em', textTransform:'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer style={{ borderTop:'1px solid var(--border)', padding:'20px 24px', textAlign:'center' }}>
        <p className="mono" style={{ fontSize:11, color:'var(--txt3)' }}>
          Rolling Returns · Fund index from AMFI · NAV data from mfapi.in · Rebuilt weekly via GitHub Actions
        </p>
      </footer>
    </>
  );
}
