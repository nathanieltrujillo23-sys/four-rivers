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
  for (const path of ["/", "/contact", "/signin", "/glossary"]) {
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
    "/community/demo-group-1/poster",
    "/community/demo-group-2",
    "/community/demo-group-2/leader",
    "/course/moments/buying-a-car",
    "/community/wealth",
    "/community/wealth?tab=toolkit",
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
  for (const path of ["/", "/contact"]) {
    test(`public page ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await scan(page, `${path} (dark)`);
    });
  }
  for (const path of ["/course", "/community/demo-group-1", "/community/demo-group-1/leader", "/community/demo-group-2"]) {
    test(`page ${path}`, async ({ page }) => {
      await signInDemo(page);
      await go(page, path);
      await page.waitForTimeout(800);
      await scan(page, `${path} (dark)`);
    });
  }
});

// Every module of the wealth plan, filled with the example so the tables, charts and cards are really on the page.
for (const theme of ["light", "dark"] as const) {
  test.describe(`wealth plan modules (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      if (theme === "dark") await page.addInitScript(() => localStorage.setItem("four-rivers:theme", "dark"));
    });
    test("every module and the brief have no serious problems", async ({ page }) => {
      test.setTimeout(120_000);
      await signInDemo(page);
      await go(page, "/community/wealth");
      await page.getByRole("button", { name: "See an example plan" }).click();
      const nav = page.getByRole("navigation", { name: "Plan modules" });
      for (const name of [/About you/, /Goals/, /SWOT/, /Reflection/, /Mission/, /Execution/]) {
        await nav.getByRole("button", { name }).click();
        await page.waitForTimeout(400);
        await scan(page, `wealth ${String(name)} (${theme})`);
      }
      for (const tab of [/Education hub/, /Weekly schedule/, /Roadmap/]) {
        await page.getByRole("tab", { name: tab }).click();
        await page.waitForTimeout(300);
        await scan(page, `wealth execution ${String(tab)} (${theme})`);
      }
      await nav.getByRole("button", { name: "One page brief", exact: true }).click();
      await page.waitForTimeout(400);
      await scan(page, `wealth brief (${theme})`);
    });
  });
}
