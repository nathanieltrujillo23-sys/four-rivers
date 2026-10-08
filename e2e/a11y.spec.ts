import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { go, signInDemo } from "./helpers.js";

// Fails on serious or critical problems that WCAG 2.1 A and AA can detect automatically. Automated checks
// catch roughly a third of accessibility issues, so this guards against regressions; it is not a full audit.
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} place(s), e.g. ${v.nodes[0]?.target.join(" ")}`,
  );
  expect(summary, `${label}: ${summary.join("; ")}`).toEqual([]);
}

test.describe("signed out", () => {
  for (const path of ["/", "/about", "/signin", "/glossary"]) {
    test(`page ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await scan(page, path);
    });
  }
});

test.describe("signed in", () => {
  const pages = [
    "/course",
    "/course/introduction/module/5",
    "/course/introduction/module/6",
    "/dashboard",
    "/challenge",
    "/search?q=money",
    "/community",
    "/community/demo-group-1",
    "/community/demo-group-1/leader",
  ];
  for (const path of pages) {
    test(`page ${path}`, async ({ page }) => {
      await signInDemo(page);
      await go(page, path);
      await page.waitForTimeout(800);
      await scan(page, path);
    });
  }
});

test.describe("dark theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("four-rivers:theme", "dark"));
  });
  for (const path of ["/", "/about"]) {
    test(`public page ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await scan(page, `${path} (dark)`);
    });
  }
  for (const path of ["/course", "/community/demo-group-1", "/community/demo-group-1/leader"]) {
    test(`page ${path}`, async ({ page }) => {
      await signInDemo(page);
      await go(page, path);
      await page.waitForTimeout(800);
      await scan(page, `${path} (dark)`);
    });
  }
});
