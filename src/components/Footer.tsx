import { POPULAR_FUNDS } from '../data/popularFunds';
import { fundUrl } from '../utils/slug';

function shortName(n: string): string {
  return n.split(' - ')[0].split('-Direct')[0].replace(/\s+(Direct|Growth|Regular)\b.*/i, '').trim() || n;
}

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', marginTop: 40 }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '48px 24px 24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 40 }}>

          {/* About / methodology */}
          <div>
            <h2 className="display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--txt)', letterSpacing: '-.01em' }}>
              About rolling returns
            </h2>
            <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.75, marginBottom: 12 }}>
              A rolling return measures a fund's return for <strong style={{ color: 'var(--txt)', fontWeight: 600 }}>every possible entry date</strong> in
              its history, not a single cherry-picked window. For each start date we
              find the NAV exactly one period later and compute the return: <strong style={{ color: 'var(--txt)', fontWeight: 600 }}>absolute</strong> for
              windows under a year, <strong style={{ color: 'var(--txt)', fontWeight: 600 }}>annualised CAGR</strong> for 1&nbsp;year and above.
            </p>
            <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.75 }}>
              Plotting all of them reveals how consistent a fund really is — its best case,
              worst case, and typical outcome regardless of timing. That's a far more
              honest measure than the point-to-point returns funds advertise.
            </p>
          </div>

          {/* Popular funds — internal links */}
          <div>
            <h2 className="display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--txt)', letterSpacing: '-.01em' }}>
              Popular funds
            </h2>
            <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 20px' }}>
              {POPULAR_FUNDS.map(f => (
                <li key={f.c}>
                  <a
                    href={fundUrl(f)}
                    style={{ fontSize: 12.5, color: 'var(--txt2)', textDecoration: 'none', lineHeight: 1.5, transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--indigo-lt)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt2)')}
                  >
                    {shortName(f.n)} rolling returns
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Data & disclaimer */}
          <div>
            <h2 className="display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--txt)', letterSpacing: '-.01em' }}>
              Data &amp; disclaimer
            </h2>
            <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.75, marginBottom: 12 }}>
              Fund list sourced from <strong style={{ color: 'var(--txt)', fontWeight: 600 }}>AMFI India</strong>, refreshed weekly.
              NAV history from <strong style={{ color: 'var(--txt)', fontWeight: 600 }}>mfapi.in</strong>, fetched live in your browser.
            </p>
            <p style={{ fontSize: 12, color: 'var(--txt3)', lineHeight: 1.7 }}>
              This tool is for informational and educational purposes only. It is
              <strong style={{ color: 'var(--txt2)' }}> not investment advice</strong> and not a
              recommendation to buy or sell any fund. Past performance does not
              guarantee future returns. Mutual fund investments are subject to market
              risks; read all scheme-related documents carefully. Verify figures with
              official sources before making any decision.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,var(--indigo),var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <g stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 18 V14.5"/><path d="M12 18 V11.5"/><path d="M17 18 V9"/>
                  <path d="M5 14 Q 11 6.5 18 6.5"/>
                </g>
                <circle cx="18" cy="6.5" r="1.5" fill="white"/>
              </svg>
            </div>
            <span className="display" style={{ fontSize: 13, fontWeight: 700 }}>Rolling Return Calculator</span>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)' }}>
            Free · No signup · Fund index rebuilt weekly via GitHub Actions
          </span>
        </div>
      </div>
    </footer>
  );
}
