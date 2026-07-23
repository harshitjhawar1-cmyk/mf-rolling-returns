import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { SearchBox, FundEntry } from './components/SearchBox';
import { StatsPanel } from './components/StatsPanel';

// Lazy-load the chart (recharts) so the landing page — what search engines
// index and most visitors see first — doesn't pay for it up front.
const RollingChart = lazy(() => import('./components/RollingChart').then(m => ({ default: m.RollingChart })));
import { RollingTable } from './components/RollingTable';
import { fetchNAVHistory, FundMeta, NAVPoint } from './utils/mfApi';
import { computeRolling, computeStats, RollingPoint } from './utils/rollingReturns';
import { track, trackPageView } from './utils/analytics';
import { fundUrl, codeFromPath, nameFromPath } from './utils/slug';
import { Footer } from './components/Footer';
import { FeedbackWidget } from './components/FeedbackWidget';

const INITIAL_PATH = typeof location !== 'undefined' ? location.pathname : '/';
const SITE = 'https://mf-rolling-returns.vercel.app';
const DEFAULT_TITLE = 'Rolling Returns Calculator — Mutual Funds India | Free Tool';
const DEFAULT_DESC  = 'Free rolling returns calculator for 14,000+ Indian mutual funds. See CAGR across every possible entry date — the honest way to judge a fund’s consistency.';

function setMetaTags(title: string, description: string, canonical: string) {
  if (typeof document === 'undefined') return;
  document.title = title;
  const set = (sel: string, attr: string, val: string) => {
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  };
  set('meta[name="description"]', 'content', description);
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', description);
  set('meta[property="og:url"]', 'content', canonical);
  set('meta[name="twitter:title"]', 'content', title);
  set('meta[name="twitter:description"]', 'content', description);
  set('link[rel="canonical"]', 'href', canonical);
}

function cleanFundName(n: string): string {
  return n.split(' - ')[0].replace(/\s+(Direct|Regular)\s+.*/i, '').trim() || n;
}

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
  const [booted, setBooted]       = useState(false);
  const resultsRef                = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const isCompare = funds.length > 1;

  const addFund = useCallback(async (entry: FundEntry) => {
    if (funds.some(f => f.fund.c === entry.c)) return;
    if (funds.length >= MAX_FUNDS) return;

    const position = funds.length + 1;
    track('fund_added', {
      scheme_code: entry.c,
      scheme_name: entry.n,
      fund_position: position,
      is_comparison: position > 1,
    });
    if (position === 2) {
      track('compare_mode_entered', { fund_count: 2 });
      trackPageView('/compare', 'MF Rolling Returns — Compare');
    } else if (position === 1) {
      trackPageView('/fund', 'MF Rolling Returns — Fund Detail');
    }

    const color = FUND_COLORS[funds.length % FUND_COLORS.length];
    const placeholder: FundData = { fund: entry, meta: null, nav: [], series: [], color, loading: true, error: '' };
    setFunds(prev => [...prev, placeholder]);

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);

    try {
      const { meta, nav } = await fetchNAVHistory(entry.c);
      const series = WINDOWS.map(w => ({ key: w.key, label: w.label, points: computeRolling(nav, w.years) }));
      // Adopt the authoritative scheme name from the API (fixes URL-loaded placeholder names)
      setFunds(prev => prev.map(f => f.fund.c === entry.c ? { ...f, meta, nav, series, loading: false, fund: { ...f.fund, n: meta.schemeName } } : f));
      track('fund_loaded', {
        scheme_code: entry.c,
        scheme_name: entry.n,
        fund_house: meta.fundHouse,
        category: meta.schemeCategory,
        nav_points: nav.length,
      });
    } catch {
      setFunds(prev => prev.map(f => f.fund.c === entry.c ? { ...f, loading: false, error: 'Failed to fetch NAV data.' } : f));
      track('fund_load_failed', { scheme_code: entry.c, scheme_name: entry.n });
    }
  }, [funds]);

  // On first load: if the URL is /fund/<slug>-<code>, auto-load that fund.
  useEffect(() => {
    const code = codeFromPath(INITIAL_PATH);
    if (code) addFund({ c: code, n: nameFromPath(INITIAL_PATH) });
    setBooted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL, document title and meta tags in sync with the current funds.
  useEffect(() => {
    if (!booted) return;
    if (funds.length === 0) {
      history.replaceState(null, '', '/');
      setMetaTags(DEFAULT_TITLE, DEFAULT_DESC, SITE + '/');
    } else if (funds.length === 1) {
      const f = funds[0];
      const url = fundUrl(f.fund);
      history.replaceState(null, '', url);
      const name = f.meta?.schemeName ?? f.fund.n;
      setMetaTags(
        `${cleanFundName(name)} — Rolling Returns & CAGR Analysis`,
        `Rolling returns for ${name}. See annualised CAGR across every historical entry date — 1Y, 3Y, 5Y, 7Y, 10Y windows with best, worst, median and consistency metrics. Live NAV data.`,
        SITE + url,
      );
    } else {
      history.replaceState(null, '', '/compare');
      const names = funds.map(f => cleanFundName(f.meta?.schemeName ?? f.fund.n)).join(' vs ');
      setMetaTags(
        `Compare Rolling Returns — ${names}`,
        `Side-by-side rolling returns comparison of ${funds.length} mutual funds across 1M–10Y windows. See which fund is more consistent.`,
        SITE + '/compare',
      );
    }
  }, [funds, booted]);

  function removeFund(code: number) {
    const removed = funds.find(f => f.fund.c === code);
    track('fund_removed', {
      scheme_code: code,
      scheme_name: removed?.fund.n,
      remaining: funds.length - 1,
    });
    setFunds(prev => prev.filter(f => f.fund.c !== code));
  }

  function toggleWindow(key: string) {
    const label = WINDOWS.find(w => w.key === key)?.label ?? key;
    if (isCompare) {
      track('compare_window_changed', { window: label });
      setCompareWindow(key);
      return;
    }
    track('window_toggled', { window: label });
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
          <img src="/logo-mark.png" alt="Rolling Return Calculator" width={30} height={30} style={{ borderRadius:8, display:'block' }} />
          <span className="display" style={{ fontWeight:700, fontSize:14, letterSpacing:'-.01em' }}>Rolling Return Calculator</span>
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
            <span className="mono" style={{ fontSize:11, color:'var(--indigo-lt)', letterSpacing:'.06em' }}>Use the tools investment professionals use</span>
          </div>

          <h1 className="display anim-2" style={{ fontSize:'clamp(2.4rem,6vw,4.2rem)', fontWeight:800, lineHeight:1.08, letterSpacing:'-.04em', marginBottom:20 }}>
            The methods used by<br/>
            <span style={{ background:'linear-gradient(90deg,var(--indigo-lt),var(--cyan))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Expert Investors</span>
          </h1>

          <p className="anim-3" style={{ fontSize:'clamp(1rem,2vw,1.15rem)', color:'var(--txt2)', lineHeight:1.75, fontWeight:300, marginBottom:44, maxWidth:580, margin:'0 auto 44px' }}>
            A fund's advertised return is just one lucky window. Rolling returns test it against <strong style={{ color:'var(--txt)', fontWeight:600 }}>every possible entry date</strong> — so you can see how <strong style={{ color:'var(--txt)', fontWeight:600 }}>consistent</strong> it really is. Consistency, not a well-timed start date, is what actually compounds your wealth. Compare up to {MAX_FUNDS} funds side by side.
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
                  onClick={() => { track('add_fund_cta_clicked', { current_funds: funds.length }); globalThis.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
              <Suspense fallback={<div style={{ height:380, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--txt3)', fontFamily:'Fira Code, monospace', fontSize:12 }}>Loading chart…</div>}>
                <RollingChart
                  funds={funds}
                  activeKeys={chartActiveKeys}
                  isCompare={isCompare}
                />
              </Suspense>
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
              { icon:'🎯', color:'var(--red)',   tag:'The problem', title:'The returns you see are cherry-picked', body:'Fund ads show returns for one flattering period. Move the start date by a year and a “great” fund can suddenly look ordinary — or worse.' },
              { icon:'👥', color:'var(--amber)',  tag:'Why it matters', title:'Same fund, very different results', body:'Two people who bought the same fund a year apart can end up with wildly different returns. One “past performance” number completely hides this timing luck.' },
              { icon:'✅', color:'var(--green)',  tag:'The fix', title:'Judge a fund on consistency', body:'Rolling returns test the fund on every possible start date at once. You instantly see the best case, the worst case, and what usually happened — no cherry-picking.' },
            ].map((f, i) => (
              <div key={i} className="feat-card">
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`color-mix(in srgb, ${f.color} 14%, transparent)`, border:`1px solid color-mix(in srgb, ${f.color} 30%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{f.icon}</div>
                  <span className="mono" style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:f.color, fontWeight:600 }}>{f.tag}</span>
                </div>
                <h3 className="display" style={{ fontSize:16, fontWeight:700, marginBottom:10, lineHeight:1.35, letterSpacing:'-.01em' }}>{f.title}</h3>
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

      <FeedbackWidget />
      <Footer />
    </>
  );
}
