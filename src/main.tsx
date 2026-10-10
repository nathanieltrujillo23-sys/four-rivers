import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary, initMonitoring } from "./lib/monitoring";
import { applyMotion } from "./lib/motion";
import { inject as injectAnalytics } from "@vercel/analytics";

initMonitoring();
applyMotion();

// Privacy-friendly page-view counts (no cookies, no personal data). It only reports once Web Analytics is
// switched on for the project in Vercel, and never in local development.
if (import.meta.env.PROD) injectAnalytics();

// Installable and offline-friendly in production builds only, so local development never serves stale files.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* the app works fine without it */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={({ resetError }) => (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-parchment p-6 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-xl text-ink">Something went wrong.</h1>
          <p className="max-w-sm font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            The page hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={() => {
              resetError();
              window.location.reload();
            }}
            className="rounded-lg bg-ink px-4 py-2 font-[family-name:var(--font-ui)] text-sm font-medium text-white"
          >
            Reload
          </button>
        </div>
      )}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
