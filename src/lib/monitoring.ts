import * as Sentry from "@sentry/react";

/**
 * Error monitoring, opt-in via env var. With no DSN set (the default for
 * local dev and until a Sentry project is created), this is a no-op: no
 * network calls, no console noise. To turn it on:
 *
 *   1. Create a free project at sentry.io (platform: React) and copy its DSN.
 *   2. Put it in Vercel as VITE_SENTRY_DSN (Production and Preview), redeploy.
 *   3. Optional: add VITE_COMMIT_SHA = $VERCEL_GIT_COMMIT_SHA so errors name the release.
 *
 * Nothing personal is sent: no emails, no IP-based profiling, and error text
 * is scrubbed of anything that looks like an email address or a token.
 */
const NOISE = [
  /ResizeObserver loop/i,
  /Failed to fetch/i, // offline or a blocked request; not a bug in the app
  /Load failed/i,
  /NetworkError when attempting to fetch/i,
  /The operation was aborted/i,
];

function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
    .replace(/(apikey|access_token|token)=[^&\s]+/gi, "$1=[redacted]");
}

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_COMMIT_SHA || undefined,
    tracesSampleRate: 0.1,
    ignoreErrors: NOISE,
    beforeSend(event) {
      if (event.message) event.message = scrub(event.message);
      for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrub(ex.value);
      if (event.request?.url) event.request.url = scrub(event.request.url);
      if (event.user) event.user = { id: event.user.id }; // never keep an email or IP
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (crumb.data?.url) crumb.data.url = scrub(String(crumb.data.url));
      return crumb;
    },
  });
}

/** Tags errors with the signed-in person's id (never their email). Pass null on sign-out. */
export function identifyUser(id: string | null) {
  if (import.meta.env.VITE_SENTRY_DSN) Sentry.setUser(id ? { id } : null);
}

/** Records an error that was caught and handled, so quiet failures still show up. */
export function reportError(err: unknown, context?: string) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(err, context ? { tags: { context } } : undefined);
}

export const ErrorBoundary = Sentry.ErrorBoundary;
