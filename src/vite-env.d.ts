/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_URL_API_BASE?: string;
  readonly VITE_AWS_REGION?: string;
  readonly VITE_AWS_ACCESS_KEY_ID?: string;
  readonly VITE_AWS_SECRET_ACCESS_KEY?: string;
  readonly VITE_AWS_SESSION_TOKEN?: string;
  readonly VITE_AWS_S3_BUCKET?: string;
  readonly VITE_AWS_S3_PREFIX?: string;
  readonly VITE_AWS_S3_PUBLIC_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
