/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MUSICKIT_DEVELOPER_TOKEN?: string;
  readonly VITE_MUSICKIT_APP_NAME?: string;
  readonly VITE_MUSICKIT_APP_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
