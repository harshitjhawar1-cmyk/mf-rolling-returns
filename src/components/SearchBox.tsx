import { useState, useEffect, useRef } from 'react';

export interface FundEntry {
  c: number;  // schemeCode
  n: string;  // schemeName
}

interface SearchBoxProps {
  onSelect: (fund: FundEntry) => void;
}

export function SearchBox({ onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [allFunds, setAllFunds] = useState<FundEntry[]>([]);
  const [results, setResults] = useState<FundEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/funds.json')
      .then(r => r.json())
      .then((data: FundEntry[]) => { setAllFunds(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const isCode = /^\d+$/.test(q);
    const filtered = allFunds
      .filter(f => isCode ? String(f.c).startsWith(q) : f.n.toLowerCase().includes(q))
      .slice(0, 12);
    setResults(filtered);
    setOpen(filtered.length > 0);
  }, [query, allFunds]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(fund: FundEntry) {
    setQuery(fund.n);
    setOpen(false);
    onSelect(fund);
  }

  return (
    <div ref={ref} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={loading ? 'Loading fund index…' : 'Search fund name or scheme code…'}
          disabled={loading}
          className="w-full pl-12 pr-4 py-4 rounded-xl text-base transition-all disabled:opacity-50"
          style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f5', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15 }}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.6)', zIndex: 50, overflow: 'hidden' }}>
          {results.map(f => (
            <button
              key={f.c}
              onClick={() => handleSelect(f)}
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'transparent', cursor: 'pointer', transition: 'background .1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, color: '#e2e8f5', fontWeight: 500, lineHeight: 1.4, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{f.n}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: 'Fira Code, monospace' }}>#{f.c}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
