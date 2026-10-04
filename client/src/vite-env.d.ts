/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB3_MODE?: string;
  readonly VITE_BATCH_REGISTRY_ADDRESS?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_TERMINAL_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
