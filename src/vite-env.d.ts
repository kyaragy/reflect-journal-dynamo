/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REPOSITORY_DRIVER?: 'localStorage' | 'api';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
