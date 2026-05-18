/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MERCADOPAGO_PUBLIC_KEY?: string;
  readonly VITE_HERO_VIDEO_URL?: string;
  readonly VITE_ADMIN_SETUP_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
