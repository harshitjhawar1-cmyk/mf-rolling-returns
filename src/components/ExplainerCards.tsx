/**
 * The "why rolling returns" explainer — three cards, each with a mini-graphic.
 * Content mirrors the approved design: Problem → Why it matters → The fix.
 */

const RED = '#f87171', AMBER = '#fbbf24', GREEN = '#34d399';

function CardShell({ accent, tag, icon, title, children }: {
  accent: string; tag: string; icon: React.ReactNode; title: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `color-mix(in srgb, ${accent} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 32%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          {icon}
        </div>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: accent, fontWeight: 600 }}>{tag}</span>
      </div>
      {title}
      {children}
    </div>
  );
}

const titleStyle: React.CSSProperties = { fontSize: 17, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-.01em', marginBottom: 10 };
const bodyStyle: React.CSSProperties = { fontSize: 13.5, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 18 };
const captionStyle: React.CSSProperties = { fontSize: 12, color: 'var(--txt3)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 };

/* ── Card 1: cherry-picked returns — same fund, two start dates ── */
function Scenario({ start, end, ret, color }: { start: string; end: string; ret: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt)' }}>{start}</span>
          <span style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,var(--txt3) 0 3px,transparent 3px 7px)' }} />
          <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{end}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1, fontFamily: 'Fira Code, monospace' }}>{ret}</div>
        <div style={{ fontSize: 9, color: 'var(--txt3)' }}>CAGR</div>
      </div>
    </div>
  );
}

/* ── Card 3: rolling timeline ── */
function RollingStrip() {
  const cols = ['Jan 2016 –\nJan 2019', 'Feb 2016 –\nFeb 2019', 'Mar 2016 –\nMar 2019', '···', 'Jan 2023 –\nJan 2026'];
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px' }}>
      <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, color: GREEN, background: 'color-mix(in srgb, #34d399 14%, transparent)', border: '1px solid color-mix(in srgb, #34d399 30%, transparent)', borderRadius: 999, padding: '2px 10px', marginBottom: 12 }}>
        3 Year Rolling Returns
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        {cols.map((c, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: c === '···' ? 'transparent' : GREEN, margin: '0 auto 6px', opacity: c === '···' ? 0 : 0.9 }} />
            <div style={{ fontSize: 8.5, color: 'var(--txt3)', lineHeight: 1.3, whiteSpace: 'pre-line', fontFamily: 'Fira Code, monospace' }}>{c}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,var(--border2),transparent)', margin: '10px 4px 0' }} />
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt2)' }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'color-mix(in srgb, #34d399 18%, transparent)', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>✓</span>
      {children}
    </div>
  );
}

/* ── Card 2: two investors ── */
function InvestorRow({ label, invested, ret, color, bg }: { label: string; invested: string; ret: string; color: string; bg: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>👤</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Invested {invested}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1, fontFamily: 'Fira Code, monospace' }}>{ret}</div>
        <div style={{ fontSize: 9, color: 'var(--txt3)' }}>5-Year Return</div>
      </div>
    </div>
  );
}

const icons = {
  target: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  people: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  chart:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>,
};

export function ExplainerCards() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 72 }}>

      {/* CARD 1 — THE PROBLEM */}
      <CardShell accent={RED} tag="The problem" icon={icons.target}
        title={<h3 className="display" style={titleStyle}>The returns you see are cherry-picked</h3>}>
        <p style={bodyStyle}>
          Fund ads show returns for one flattering period. Move the start date by a year
          and a “great” fund can suddenly look ordinary — or worse.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)' }}>Same fund, two start dates</div>
          <Scenario start="Jan 2020" end="Dec 2024" ret="18%" color={GREEN} />
          <Scenario start="Jan 2021" end="Dec 2024" ret="7%" color={AMBER} />
        </div>
        <div style={captionStyle}><span style={{ color: RED }}>◆</span> Different start. Very different outcome.</div>
      </CardShell>

      {/* CARD 2 — WHY IT MATTERS */}
      <CardShell accent={AMBER} tag="Why it matters" icon={icons.people}
        title={<h3 className="display" style={titleStyle}>Same fund, very different results</h3>}>
        <p style={bodyStyle}>
          Two people who bought the same fund a year apart can end up with wildly different
          returns. One “past performance” number completely hides this timing luck.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InvestorRow label="Investor A" invested="Jan 2020" ret="18%" color={GREEN} bg="color-mix(in srgb, #34d399 22%, var(--surface2))" />
          <InvestorRow label="Investor B" invested="Jan 2021" ret="7%" color={AMBER} bg="color-mix(in srgb, #fbbf24 22%, var(--surface2))" />
        </div>
        <div style={captionStyle}><span style={{ color: AMBER }}>★</span> Timing can change everything.</div>
      </CardShell>

      {/* CARD 3 — THE FIX */}
      <CardShell accent={GREEN} tag="The fix" icon={icons.chart}
        title={<h3 className="display" style={titleStyle}>Judge a fund on consistency</h3>}>
        <p style={bodyStyle}>
          Rolling returns test the fund on every possible start date at once. You instantly
          see the best case, the worst case, and what usually happened — no cherry-picking.
        </p>
        <RollingStrip />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <Check>See the best, worst &amp; average</Check>
          <Check>Understand downside risk</Check>
          <Check>Make smarter, confident choices</Check>
        </div>
        <div style={captionStyle}><span style={{ color: GREEN }}>🏆</span> Consistency beats luck.</div>
      </CardShell>
    </div>
  );
}
