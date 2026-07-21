import { useState, useEffect, useRef } from 'react';

export interface FundEntry {
  c: number;
  n: string;
}

interface SearchBoxProps {
  onSelect: (fund: FundEntry) => void;
  addedCodes?: number[];
  placeholder?: string;
}

export function SearchBox({ onSelect, addedCodes = [], placeholder }: SearchBoxProps) {
  const [query, setQuery]       = useState('');
  const [allFunds, setAllFunds] = useState<FundEntry[]>([]);
  const [results, setResults]   = useState<FundEntry[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/funds.json')
      .then(r => r.json())
      .then((d: FundEntry[]) => { setAllFunds(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const q = query.toLowerCase();
    const isCode = /^\d+$/.test(q);
    setResults(allFunds.filter(f => isCode ? String(f.c).startsWith(q) : f.n.toLowerCase().includes(q)).slice(0, 12));
    setOpen(true);
  }, [query, allFunds]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleSelect(fund: FundEntry) {
    setQuery('');   // clear so user can search for another
    setOpen(false);
    onSelect(fund);
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <svg style={{ position: 'absolute', left: 16, width: 18, height: 18, color: '#475569', pointerEvents: 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={loading ? 'Loading fund index…' : (placeholder ?? 'Search fund name or scheme code…')}
          disabled={loading}
          style={{
            width: '100%', paddingLeft: 48, paddingRight: 16, paddingTop: 16, paddingBottom: 16,
            background: 'transparent', border: 'none', outline: 'none',
            color: '#e2e8f5', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15,
            opacity: loading ? .5 : 1,
          }}
        />
        {loading && <div style={{ position: 'absolute', right: 16, width: 16, height: 16, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
          background: '#111827', border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,.7)', zIndex: 100, overflow: 'hidden',
          maxHeight: 360, overflowY: 'auto',
        }}>
          {results.map(f => {
            const added = addedCodes.includes(f.c);
            return (
              <button
                key={f.c}
                onClick={() => !added && handleSelect(f)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '11px 16px',
                  borderBottom: '1px solid rgba(255,255,255,.05)',
                  background: 'transparent', cursor: added ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  opacity: added ? .5 : 1,
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!added) e.currentTarget.style.background = 'rgba(99,102,241,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f5', fontWeight: 500, lineHeight: 1.4, fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.n}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: 'Fira Code, monospace' }}>#{f.c}</div>
                </div>
                {added
                  ? <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', fontFamily: 'Fira Code' }}>added</span>
                  : <span style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,102,241,.2)', border: '1px solid rgba(99,102,241,.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#818cf8', fontSize: 16, lineHeight: 1,
                    }}>+</span>
                }
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
