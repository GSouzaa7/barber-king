/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MERCADOPAGO_PUBLIC_KEY: string;
  readonly VITE_HERO_VIDEO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
