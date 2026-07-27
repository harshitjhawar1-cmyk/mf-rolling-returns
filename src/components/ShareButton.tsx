import { useState, useRef, useEffect } from 'react';
import { track } from '../utils/analytics';

interface ShareButtonProps {
  title: string;   // e.g. "Parag Parikh Flexi Cap Fund — Rolling Returns"
  text: string;    // pre-filled share message (without the URL)
}

export function ShareButton({ title, text }: ShareButtonProps) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const url = typeof location !== 'undefined' ? location.href : '';
  const shareMsg = `${text}`;

  async function onClick() {
    // Mobile / supported browsers → native share sheet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ title, text: shareMsg, url });
        track('chart_shared', { method: 'native' });
      } catch { /* user cancelled */ }
      return;
    }
    setOpen(o => !o);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track('chart_shared', { method: 'copy_link' });
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareMsg} ${url}`)}`;
  const xHref  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMsg)}&url=${encodeURIComponent(url)}`;

  const item: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '10px 14px', background: 'transparent', border: 'none',
    color: 'var(--txt)', fontSize: 13, cursor: 'pointer', textAlign: 'left',
    textDecoration: 'none', fontFamily: "'Plus Jakarta Sans',sans-serif",
    transition: 'background .1s',
  };
  const hover = (e: React.MouseEvent<HTMLElement>, on: boolean) =>
    (e.currentTarget.style.background = on ? 'rgba(99,102,241,.12)' : 'transparent');

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={onClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 14px', borderRadius: 9,
          border: '1px solid rgba(99,102,241,.4)', background: 'rgba(99,102,241,.12)',
          color: 'var(--indigo-lt)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,.2)'; e.currentTarget.style.borderColor = 'var(--indigo)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,.4)'; }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>
        </svg>
        Share
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, marginTop: 4, zIndex: 60,
          width: 210, background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.55)',
        }}>
          <button style={item} onClick={copyLink} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </button>
          <a style={item} href={waHref} target="_blank" rel="noopener noreferrer" onClick={() => track('chart_shared', { method: 'whatsapp' })} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
            <span style={{ width: 16, textAlign: 'center' }}>💬</span> WhatsApp
          </a>
          <a style={item} href={xHref} target="_blank" rel="noopener noreferrer" onClick={() => track('chart_shared', { method: 'twitter' })} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Post on X
          </a>
        </div>
      )}
    </div>
  );
}
