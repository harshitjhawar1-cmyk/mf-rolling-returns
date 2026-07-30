/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_ID?: string;
  readonly VITE_FEEDBACK_ENDPOINT?: string;
  readonly VITE_SMARTLOOK_KEY?: string;
  readonly VITE_SMARTLOOK_REGION?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
