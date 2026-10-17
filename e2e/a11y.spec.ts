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

// The career prep page, with something in each tab.
for (const theme of ["light", "dark"] as const) {
  test(`career prep (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    if (theme === "dark") await page.addInitScript(() => localStorage.setItem("four-rivers:theme", "dark"));
    await signInDemo(page);
    await go(page, "/community/wealth/prep");
    await page.waitForTimeout(500);
    for (const tab of ["Technical questions", "Behavioral", "Practice clients", "Market journal", "Readiness", "Applications", "Resume bullets"]) {
      await page.getByRole("tab", { name: tab }).click();
      await page.waitForTimeout(250);
      if (tab === "Technical questions") await page.getByRole("button", { name: "Show the answer" }).first().click();
      await scan(page, `prep ${tab} (${theme})`);
    }
  });
}

// The track community page: learning path, case library with an open review form, and reviews.
for (const theme of ["light", "dark"] as const) {
  test(`track community (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    if (theme === "dark") await page.addInitScript(() => localStorage.setItem("four-rivers:theme", "dark"));
    await signInDemo(page);
    await go(page, "/community/wealth/cases");
    await page.waitForTimeout(500);
    await scan(page, `community path (${theme})`);
    await page.getByRole("tab", { name: "Case library" }).click();
    await page.getByRole("button", { name: /^Review College junior/ }).click();
    await page.waitForTimeout(250);
    await scan(page, `community library (${theme})`);
    await page.getByRole("tab", { name: "Reviews" }).click();
    await page.waitForTimeout(250);
    await scan(page, `community reviews (${theme})`);
  });
}

// Every step of a client's plan, filled with the example so the tables, charts and cards are really on the page.
for (const theme of ["light", "dark"] as const) {
  test.describe(`wealth plan steps (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      if (theme === "dark") await page.addInitScript(() => localStorage.setItem("four-rivers:theme", "dark"));
    });
    test("every step has no serious problems", async ({ page }) => {
      test.setTimeout(150_000);
      await signInDemo(page);
      await go(page, "/community/wealth");
      await scan(page, `wealth clients list (${theme})`);
      await page.getByRole("button", { name: "See an example client" }).click();
      const nav = page.getByRole("navigation", { name: "Plan steps" });
      for (const name of [/Client/, /Snapshot/, /Goals/, /SWOT/, /Strategy/, /Mission/, /Risk and IPS/, /Portfolio/, /Focus areas/, /Model/]) {
        await nav.getByRole("button", { name }).click();
        await page.waitForTimeout(400);
        await scan(page, `wealth ${String(name)} (${theme})`);
      }
      for (const pt of ['Allocation', 'Efficient frontier', 'Stress tests', 'Fees and rebalancing']) {
        await nav.getByRole('button', { name: /Portfolio/ }).click();
        await page.getByRole('tab', { name: pt }).click();
        await page.waitForTimeout(300);
        await scan(page, `wealth portfolio ${pt} (${theme})`);
      }
      await nav.getByRole('button', { name: /Model/ }).click();
      for (const tab of [/Retirement income/, /Education hub/, /Weekly schedule/, /Roadmap/]) {
        await page.getByRole("tab", { name: tab }).click();
        await page.waitForTimeout(300);
        await scan(page, `wealth model ${String(tab)} (${theme})`);
      }
      await nav.getByRole("button", { name: /Presentation/ }).click();
      await page.getByRole("button", { name: "Show the one-page brief" }).click();
      await page.waitForTimeout(400);
      await scan(page, `wealth presentation (${theme})`);
    });
  });
}
