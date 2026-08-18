interface ImportMetaEnv {
  readonly VITE_RELEASE_VERSION?: string;
  readonly VITE_RELEASE_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
