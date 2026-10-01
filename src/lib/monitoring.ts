import * as Sentry from "@sentry/react";

/**
 * Error monitoring, opt-in via env var. With no DSN set (the default for
 * local dev and until a Sentry project is created), this is a no-op — no
 * network calls, no console noise. Set VITE_SENTRY_DSN in .env.local and in
 * Vercel's project env vars to turn it on in a given environment.
 */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.2,
  });
}

export const ErrorBoundary = Sentry.ErrorBoundary;
