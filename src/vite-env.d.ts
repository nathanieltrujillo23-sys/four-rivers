/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Optional — error monitoring is a no-op until this is set. */
  readonly VITE_SENTRY_DSN?: string;
  /** Optional: names the release in error reports (set to Vercel's $VERCEL_GIT_COMMIT_SHA). */
  readonly VITE_COMMIT_SHA?: string;
  /** Optional: the VAPID public key for reading reminders on devices (see api/reminders.ts). */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
