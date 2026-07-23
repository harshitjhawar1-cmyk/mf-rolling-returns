import { useState } from 'react';
import { track } from '../utils/analytics';

const ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined;

type State = 'idle' | 'sending' | 'done' | 'error';

export function FeedbackWidget() {
  const [open, setOpen]       = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail]     = useState('');
  const [state, setState]     = useState<State>('idle');

  function openModal() {
    setOpen(true);
    setState('idle');
    track('feedback_opened');
  }

  async function submit() {
    if (!message.trim()) return;
    setState('sending');
    const payload = {
      message: message.trim(),
      email: email.trim(),
      page: typeof location !== 'undefined' ? location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      submittedAt: new Date().toISOString(),
    };
    try {
      if (ENDPOINT) {
        // Apps Script web apps reject CORS preflight; text/plain + no-cors avoids it.
        await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
      }
      track('feedback_submitted', { has_email: !!email.trim(), length: message.trim().length });
      setState('done');
      setMessage('');
      setEmail('');
      setTimeout(() => setOpen(false), 2200);
    } catch {
      setState('error');
    }
  }

  return (
    <>
      {/* Trigger section (above footer) */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 className="display" style={{ fontSize: 'clamp(1.2rem,2.4vw,1.6rem)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 10 }}>
            Help shape this tool
          </h2>
          <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.7, marginBottom: 24 }}>
            What feature is missing that would help you make better investment decisions?
            Your input directly guides what gets built next.
          </p>
          <button
            onClick={openModal}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 26px', borderRadius: 12,
              background: 'linear-gradient(135deg,var(--indigo),var(--cyan))',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15,
            }}
          >
            💡 Share feedback
          </button>
        </div>
      </section>

      {/* Modal */}
      {open && (
        <div
          onClick={() => state !== 'sending' && setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,6,12,.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 18, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}
          >
            {state === 'done' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
                <h3 className="display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Thank you!</h3>
                <p style={{ fontSize: 14, color: 'var(--txt2)' }}>Your feedback has been recorded.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <h3 className="display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.01em' }}>Share your feedback</h3>
                    <p style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 4 }}>What would make this more useful for you?</p>
                  </div>
                  <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
                </div>

                <label style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  Missing features or ideas <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  autoFocus
                  rows={4}
                  placeholder="e.g. SIP rolling returns, downside deviation, rolling returns vs a benchmark, export to CSV…"
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', color: 'var(--txt)', fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif", resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
                />

                <label style={{ fontSize: 12, color: 'var(--txt2)', fontWeight: 500, display: 'block', margin: '14px 0 6px' }}>
                  Email <span style={{ color: 'var(--txt3)', fontWeight: 400 }}>(optional — if you want a reply)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 12px', color: 'var(--txt)', fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif", outline: 'none' }}
                />

                {state === 'error' && (
                  <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 12 }}>Something went wrong. Please try again.</p>
                )}

                <button
                  onClick={submit}
                  disabled={!message.trim() || state === 'sending'}
                  style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, border: 'none', cursor: message.trim() && state !== 'sending' ? 'pointer' : 'not-allowed', background: message.trim() ? 'linear-gradient(135deg,var(--indigo),var(--cyan))' : 'var(--border2)', color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: "'Bricolage Grotesque',sans-serif", opacity: message.trim() ? 1 : .6 }}
                >
                  {state === 'sending' ? 'Sending…' : 'Send feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
