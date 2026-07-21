/**
 * Google Analytics 4 wrapper.
 * Measurement ID is read from VITE_GA_ID (set in Vercel env / .env).
 * All tracking is no-op when the ID is absent, so local dev stays clean.
 */

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;
  }
}

let ready = false;

/** Inject gtag.js and configure GA4. Call once on app boot. */
export function initGA() {
  if (!GA_ID || ready || typeof document === 'undefined') return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.gtag = function gtag(...args: any[]) { window.dataLayer.push(args); };
  window.gtag('js', new Date());
  // We send page views manually so we can label SPA states
  window.gtag('config', GA_ID, { send_page_view: false });

  ready = true;
}

/** Track a custom event with optional params. */
export function track(event: string, params?: Record<string, unknown>) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', event, params ?? {});
}

/** Track a (virtual) page view for an SPA state. */
export function trackPageView(path: string, title: string) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.origin + path,
  });
}

export const analyticsEnabled = !!GA_ID;
