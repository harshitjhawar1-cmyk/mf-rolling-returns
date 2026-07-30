/**
 * Smartlook — heatmaps + session recordings.
 * Loads fully async (non-blocking, negligible performance impact).
 * Project key from VITE_SMARTLOOK_KEY, region from VITE_SMARTLOOK_REGION
 * (default 'eu'). No-ops when the key is absent, so dev stays clean.
 */

const KEY    = (import.meta.env.VITE_SMARTLOOK_KEY as string | undefined) || '';
const REGION = (import.meta.env.VITE_SMARTLOOK_REGION as string | undefined) || 'eu';

export function initSmartlook() {
  if (!KEY || typeof document === 'undefined') return;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = window as any;
  w.smartlook || (function (d: Document) {
    const o: any = (w.smartlook = function () { o.api.push(arguments); });
    const h = d.getElementsByTagName('head')[0];
    const c = d.createElement('script');
    o.api = [];
    c.async = true;
    c.type = 'text/javascript';
    c.charset = 'utf-8';
    c.src = 'https://web-sdk.smartlook.com/recorder.js';
    h.appendChild(c);
  })(document);
  w.smartlook('init', KEY, { region: REGION });
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const smartlookEnabled = !!KEY;
