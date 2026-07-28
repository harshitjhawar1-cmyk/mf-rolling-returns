import { useState, useRef, useEffect } from 'react';
import { track } from '../utils/analytics';
import { ShareCard, ShareCardData } from './ShareCard';

interface ShareButtonProps {
  title: string;   // e.g. "Parag Parikh Flexi Cap Fund — Rolling Returns"
  text: string;    // pre-filled share message (without the URL)
  image?: ShareCardData; // when present, enables "download/share as image"
}

export function ShareButton({ title, text, image }: ShareButtonProps) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const url = typeof location !== 'undefined' ? location.href : '';
  const shareMsg = `${text}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canShareFiles = typeof navigator !== 'undefined' && (navigator as any).canShare;

  async function shareLink() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.share) {
      try { await nav.share({ title, text: shareMsg, url }); track('chart_shared', { method: 'native' }); } catch { /* cancelled */ }
    } else {
      copyLink();
    }
    setOpen(false);
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

  const fileName = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60)}.png`;

  async function renderImage(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    const { toBlob } = await import('html-to-image');
    return toBlob(cardRef.current, { pixelRatio: 1.5, cacheBust: true, backgroundColor: '#080c14' });
  }

  async function downloadImage() {
    setBusy(true);
    try {
      const blob = await renderImage();
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
      track('chart_shared', { method: 'download_image' });
    } catch { /* ignore */ } finally { setBusy(false); setOpen(false); }
  }

  async function shareImage() {
    setBusy(true);
    try {
      const blob = await renderImage();
      if (!blob) return;
      const file = new File([blob], fileName, { type: 'image/png' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title, text: `${shareMsg} ${url}` });
        track('chart_shared', { method: 'share_image' });
      } else {
        await downloadImage();
      }
    } catch { /* cancelled */ } finally { setBusy(false); setOpen(false); }
  }

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
        onClick={() => setOpen(o => !o)}
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
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button style={item} onClick={shareLink} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
              Share…
            </button>
          )}
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

          {image && <>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            {canShareFiles && (
              <button style={item} onClick={shareImage} disabled={busy} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
                <span style={{ width: 16, textAlign: 'center' }}>🖼️</span> {busy ? 'Preparing…' : 'Share image'}
              </button>
            )}
            <button style={item} onClick={downloadImage} disabled={busy} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {busy ? 'Preparing…' : 'Download image'}
            </button>
          </>}
        </div>
      )}

      {/* Off-screen card used only for image capture */}
      {image && (
        <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none', opacity: 0 }} aria-hidden>
          <ShareCard ref={cardRef} data={image} />
        </div>
      )}
    </div>
  );
}
