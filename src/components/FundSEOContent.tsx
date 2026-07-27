import { deriveFundHouse, derivePlan, deriveCategory } from '../utils/fundMeta';

interface FundSEOContentProps {
  fundName: string;               // full AMFI scheme name
  apiCategory?: string;           // scheme_category from the API, if loaded
  apiFundHouse?: string;          // fund_house from the API, if loaded
}

function shortName(n: string): string {
  return n.split(' - ')[0].replace(/\s+(Direct|Regular)\s+.*/i, '').replace(/\s*[-–]\s*(Growth|IDCW|Dividend).*/i, '').trim() || n;
}

export function FundSEOContent({ fundName, apiCategory, apiFundHouse }: FundSEOContentProps) {
  const name = shortName(fundName);
  const house = apiFundHouse || deriveFundHouse(fundName);
  const plan = derivePlan(fundName);
  const cat = deriveCategory(fundName);
  const category = apiCategory && apiCategory.trim() ? apiCategory : cat.category;

  const faqs: { q: string; a: string }[] = [
    {
      q: `What are the rolling returns of ${name}?`,
      a: `Rolling returns for ${name} measure its annualised return (CAGR) for every possible entry date across its history — not just one flattering period. Use the interactive chart above to see its 1-year, 3-year, 5-year, 7-year and 10-year rolling returns, along with the best, worst, median and average outcome for each window.`,
    },
    {
      q: `Is ${name} a consistent performer?`,
      a: `The best way to judge consistency is the “% positive periods” and the gap between the best and worst rolling return shown above. A high share of positive periods and a narrow best-to-worst range mean ${name} delivered more reliably regardless of when you invested. A wide range means outcomes depended heavily on timing.`,
    },
    {
      q: `What is the 5-year return of ${name}?`,
      a: `Instead of a single 5-year number (which depends entirely on the start date you pick), the chart above shows the full range of 5-year returns ${name} has delivered across every historical starting point. Select the 5Y window to see its best, worst, median and average 5-year CAGR.`,
    },
    {
      q: `How is ${name}'s performance calculated here?`,
      a: `Returns are computed from ${name}'s official daily NAV history sourced live from AMFI via mfapi.in. For windows of one year or more we show annualised CAGR; for 1-month, 3-month and 6-month windows we show the absolute return. No data is stored — everything is calculated in your browser.`,
    },
  ];

  const wrap: React.CSSProperties = { maxWidth: 820 };
  const h2: React.CSSProperties = { fontSize: 'clamp(1.1rem,2.2vw,1.4rem)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 12 };
  const p: React.CSSProperties = { fontSize: 14.5, color: 'var(--txt2)', lineHeight: 1.8, marginBottom: 14 };

  return (
    <section style={{ maxWidth: 1140, margin: '0 auto 60px', padding: '0 24px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 'clamp(28px, 5vw, 44px)' }}>
        <div style={wrap}>
          {/* Overview */}
          <h2 className="display" style={h2}>About {name}</h2>
          <p style={p}>
            <strong style={{ color: 'var(--txt)' }}>{name}</strong>
            {plan ? ` (${plan} Plan)` : ''} is {/^[aeiou]/i.test(category) ? 'an' : 'a'}{' '}
            <strong style={{ color: 'var(--txt)' }}>{category}</strong>
            {house ? <> from <strong style={{ color: 'var(--txt)' }}>{house} Mutual Fund</strong></> : ''} —
            a fund that {cat.blurb}. This page analyses its <strong style={{ color: 'var(--txt)' }}>rolling returns</strong>,
            long-term <strong style={{ color: 'var(--txt)' }}>performance</strong> and <strong style={{ color: 'var(--txt)' }}>return consistency</strong>{' '}
            using its full NAV history.
          </p>
          <p style={p}>
            Most sites show {name}'s return for a single, hand-picked period — which can make almost
            any fund look good or bad depending on the dates chosen. The interactive tool above instead
            tests {name} across <strong style={{ color: 'var(--txt)' }}>every possible entry date</strong>, so you can see how
            it would have performed no matter when you invested — the honest way to judge a {category.toLowerCase()}.
          </p>

          {/* How to read */}
          <h2 className="display" style={{ ...h2, marginTop: 28 }}>How to read {name}'s rolling returns</h2>
          <p style={p}>
            Pick a rolling window (1M to 10Y) above. Each point on the chart is {name}'s annualised
            CAGR for that holding period ending on that date. The stat cards show the{' '}
            <strong style={{ color: 'var(--txt)' }}>best</strong>, <strong style={{ color: 'var(--txt)' }}>worst</strong>,{' '}
            <strong style={{ color: 'var(--txt)' }}>median</strong> and <strong style={{ color: 'var(--txt)' }}>average</strong> return,
            plus how often the fund ended positive. You can also add other funds to compare {name}'s
            consistency side by side.
          </p>

          {/* FAQ */}
          <h2 className="display" style={{ ...h2, marginTop: 28 }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {faqs.map((f, i) => (
              <div key={i}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 6, lineHeight: 1.4 }}>{f.q}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--txt2)', lineHeight: 1.75 }}>{f.a}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'var(--txt3)', lineHeight: 1.7, marginTop: 26 }}>
            {name} rolling returns, {name} performance, {name} CAGR and {name} NAV are shown for
            informational purposes only and are not investment advice. Data sourced from AMFI. Past
            performance does not guarantee future returns.
          </p>
        </div>
      </div>
    </section>
  );
}
