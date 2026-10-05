import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the real app in a browser using its built-in demo account (user "demo", password
// "demo"), which runs entirely in memory: no real accounts, no database, nothing to clean up.
//
//   npm run test:e2e            run everything (starts the dev server if it is not running)
//   npx playwright test --ui    watch it work
//
// Locally it uses the Chrome already installed on your computer. In CI (the CI variable is set) it uses the
// Chromium that `npx playwright install chromium` downloads.
const channel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:5273", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "phone", use: { ...devices["Pixel 5"], channel }, testIgnore: /a11y/ },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5273",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // The app needs these to start; the demo account never talks to the database, so any values work in CI.
    env: process.env.CI
      ? { VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_ANON_KEY: "ci-placeholder-key" }
      : {},
  },
});
