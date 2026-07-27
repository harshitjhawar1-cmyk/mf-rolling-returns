/**
 * Derive human-useful metadata from an AMFI scheme name alone.
 * Used to generate unique, keyword-rich content on each fund page without
 * needing a live API call at build time.
 */

const AMCS = [
  'Aditya Birla Sun Life', 'Axis', 'Bandhan', 'Bank of India', 'Baroda BNP Paribas',
  'Canara Robeco', 'DSP', 'Edelweiss', 'Franklin', 'HDFC', 'HSBC', 'ICICI Prudential',
  'IDFC', 'Invesco', 'ITI', 'JM Financial', 'Kotak', 'LIC', 'Mahindra Manulife',
  'Mirae Asset', 'Motilal Oswal', 'Navi', 'Nippon India', 'PGIM', 'PPFAS', 'Parag Parikh',
  'Quant', 'quant', 'Quantum', 'SBI', 'Samco', 'Sundaram', 'Tata', 'Taurus',
  'Union', 'UTI', 'WhiteOak Capital', 'Zerodha', '360 ONE', 'Groww', 'NJ', 'Trust',
  'Old Bridge', 'Helios', 'Bajaj Finserv',
];

export function deriveFundHouse(name: string): string {
  const found = AMCS.find(a => name.toLowerCase().startsWith(a.toLowerCase()));
  if (found) return found === 'quant' ? 'Quant' : found;
  // fallback: first two words
  return name.split(/\s+/).slice(0, 2).join(' ');
}

export function derivePlan(name: string): 'Direct' | 'Regular' | '' {
  if (/\bdirect\b/i.test(name)) return 'Direct';
  if (/\bregular\b/i.test(name)) return 'Regular';
  return '';
}

export interface CategoryInfo {
  category: string;      // e.g. "Large Cap Fund"
  assetClass: 'Equity' | 'Debt' | 'Hybrid' | 'Commodity' | 'Other';
  blurb: string;         // one-line description of what this category invests in
}

export function deriveCategory(name: string): CategoryInfo {
  const n = name.toLowerCase();
  const eq = (category: string, blurb: string): CategoryInfo => ({ category, assetClass: 'Equity', blurb });
  const debt = (category: string, blurb: string): CategoryInfo => ({ category, assetClass: 'Debt', blurb });
  const hyb = (category: string, blurb: string): CategoryInfo => ({ category, assetClass: 'Hybrid', blurb });

  // Index / passive
  if (/nifty|sensex|index|bse |nse /.test(n) && !/debt|bond|sdl|gilt|psu/.test(n))
    return eq('Index Fund', 'passively tracks a market index like the Nifty 50 or Sensex');
  // ELSS
  if (/elss|tax saver|tax saving/.test(n)) return eq('ELSS (Tax Saver)', 'invests in equities with a 3-year lock-in and Section 80C tax benefit');
  // Market-cap equity
  if (/large & mid|large and mid/.test(n)) return eq('Large & Mid Cap Fund', 'splits investments between large-cap and mid-cap companies');
  if (/large ?cap|bluechip|blue chip|top 100/.test(n)) return eq('Large Cap Fund', 'invests mainly in India’s largest, most established companies');
  if (/mid ?cap/.test(n)) return eq('Mid Cap Fund', 'invests in mid-sized companies with higher growth potential and volatility');
  if (/small ?cap/.test(n)) return eq('Small Cap Fund', 'invests in small, emerging companies — high growth potential, high risk');
  if (/multi ?cap/.test(n)) return eq('Multi Cap Fund', 'invests across large, mid and small-cap stocks with fixed minimums in each');
  if (/flexi ?cap/.test(n)) return eq('Flexi Cap Fund', 'invests across market caps with full flexibility to shift allocation');
  if (/focused/.test(n)) return eq('Focused Fund', 'holds a concentrated portfolio of up to 30 high-conviction stocks');
  if (/value/.test(n)) return eq('Value Fund', 'follows a value-investing strategy, buying undervalued companies');
  if (/contra/.test(n)) return eq('Contra Fund', 'takes contrarian bets against prevailing market trends');
  if (/dividend yield/.test(n)) return eq('Dividend Yield Fund', 'invests in high dividend-yielding stocks');
  // Sectoral / thematic
  if (/nasdaq|s&p 500|us equity|global|international|world|greater china|emerging market/.test(n))
    return eq('International Fund', 'invests in overseas equities for global diversification');
  if (/bank|financial/.test(n) && !/debt|psu debt/.test(n)) return eq('Sectoral – Banking & Financial', 'concentrates on banking and financial-services stocks');
  if (/pharma|health/.test(n)) return eq('Sectoral – Pharma & Healthcare', 'concentrates on pharmaceutical and healthcare stocks');
  if (/tech|digital|it fund/.test(n)) return eq('Sectoral – Technology', 'concentrates on technology and IT stocks');
  if (/infra/.test(n)) return eq('Sectoral – Infrastructure', 'concentrates on infrastructure and allied sectors');
  if (/consum/.test(n)) return eq('Thematic – Consumption', 'invests around the India consumption theme');
  // Commodity
  if (/gold/.test(n)) return { category: 'Gold Fund', assetClass: 'Commodity', blurb: 'tracks the price of physical gold' };
  if (/silver/.test(n)) return { category: 'Silver Fund', assetClass: 'Commodity', blurb: 'tracks the price of physical silver' };
  // Hybrid
  if (/balanced advantage|dynamic asset|baf\b/.test(n)) return hyb('Balanced Advantage Fund', 'dynamically shifts between equity and debt based on market valuations');
  if (/aggressive hybrid|equity hybrid/.test(n)) return hyb('Aggressive Hybrid Fund', 'holds mostly equity with a debt cushion (65–80% equity)');
  if (/conservative hybrid/.test(n)) return hyb('Conservative Hybrid Fund', 'holds mostly debt with a small equity allocation');
  if (/equity savings/.test(n)) return hyb('Equity Savings Fund', 'blends equity, arbitrage and debt for lower volatility');
  if (/multi asset/.test(n)) return hyb('Multi Asset Allocation Fund', 'diversifies across equity, debt and commodities');
  if (/arbitrage/.test(n)) return hyb('Arbitrage Fund', 'exploits price differences between cash and futures markets');
  if (/balanced/.test(n)) return hyb('Hybrid Fund', 'blends equity and debt in one portfolio');
  // Debt
  if (/liquid/.test(n)) return debt('Liquid Fund', 'invests in very short-term instruments for parking surplus cash');
  if (/overnight/.test(n)) return debt('Overnight Fund', 'invests in 1-day maturity instruments — the lowest-risk debt category');
  if (/ultra short/.test(n)) return debt('Ultra Short Duration Fund', 'invests in debt maturing in 3–6 months');
  if (/low duration/.test(n)) return debt('Low Duration Fund', 'invests in debt maturing in 6–12 months');
  if (/money market/.test(n)) return debt('Money Market Fund', 'invests in money-market instruments up to 1 year');
  if (/corporate bond/.test(n)) return debt('Corporate Bond Fund', 'invests mainly in high-rated corporate bonds');
  if (/credit risk/.test(n)) return debt('Credit Risk Fund', 'invests in lower-rated bonds for higher yield and risk');
  if (/banking & psu|banking and psu|psu/.test(n)) return debt('Banking & PSU Debt Fund', 'invests in bonds of banks and public-sector undertakings');
  if (/gilt/.test(n)) return debt('Gilt Fund', 'invests in government securities with no credit risk');
  if (/short duration|short term/.test(n)) return debt('Short Duration Fund', 'invests in debt maturing in 1–3 years');
  if (/medium duration/.test(n)) return debt('Medium Duration Fund', 'invests in debt maturing in 3–4 years');
  if (/long duration/.test(n)) return debt('Long Duration Fund', 'invests in long-maturity debt, sensitive to rate changes');
  if (/dynamic bond/.test(n)) return debt('Dynamic Bond Fund', 'varies debt maturity based on the interest-rate outlook');
  if (/debt|bond|income|sdl|fixed/.test(n)) return debt('Debt Fund', 'invests in fixed-income instruments like bonds and government securities');

  return eq('Equity Fund', 'invests primarily in stocks for long-term growth');
}
