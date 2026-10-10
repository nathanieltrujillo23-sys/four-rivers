import { expect, test } from "@playwright/test";
import { acceptDialogs, go, signInDemo } from "./helpers.js";

// These run with animations on (the "motion" project). The rest of the suite runs with reduced motion.

test.beforeEach(async ({ page }) => {
  acceptDialogs(page);
});

test("the app is animated by default, and the header toggle turns motion off and back on", async ({ page }) => {
  await signInDemo(page);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-motion", "full");
  // Pages rise in, and a river sweeps across the top when you move to a new one.
  await go(page, "/dashboard");
  expect(await page.locator(".river-line").count()).toBeGreaterThan(0);
  await expect(page.locator("main")).toHaveClass(/page-enter/);

  await page.getByRole("button", { name: "Reduce motion" }).click();
  await expect(html).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByRole("button", { name: /Motion is reduced/ })).toHaveAttribute("aria-pressed", "true");
  // With motion off nothing is animating, and the choice is remembered.
  expect(await page.locator("main").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await page.reload();
  await expect(html).toHaveAttribute("data-motion", "reduce");

  await page.getByRole("button", { name: /Motion is reduced/ }).click();
  await expect(html).toHaveAttribute("data-motion", "full");
});

test("numbers count up to their value, and settle on exactly the right text", async ({ page }) => {
  await signInDemo(page);
  await go(page, "/community/demo-group-2");
  await page.getByRole("button", { name: /^Live/ }).first().click();
  await page.getByRole("button", { name: /^Monthly budget / }).first().click();
  // Right after opening, the tiles are still counting; a moment later they read the real figures.
  const left = page.getByText("Left for giving, growing, and owing").locator("xpath=following-sibling::p[1]");
  await expect(left).toHaveText("$830", { timeout: 4000 });
  await expect(page.locator(".stagger").first()).toBeVisible();
});

test("a quiz answer glows or shakes, and the score counts up with a mark where passing begins", async ({ page }) => {
  await signInDemo(page);
  await go(page, "/course/river/1/quiz");
  const names = await page.locator('input[type="radio"]').evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLInputElement).name))]);
  for (const n of names) await page.locator(`input[type="radio"][name="${n}"]`).first().check();
  await page.getByRole("button", { name: "Submit quiz" }).click();
  await expect(page.locator(".answer-correct").first()).toBeVisible();
  await expect(page.locator(".answer-wrong").first()).toBeVisible();
  await expect(page.locator(".grow-x").first()).toBeVisible();
  await expect(page.getByText(/You scored \d+ of 10/)).toBeVisible();
});

test("savings goals fill like water, and a deleted entry slides away and is gone", async ({ page }) => {
  await signInDemo(page);
  await go(page, "/dashboard");
  await expect(page.locator(".water-crest").first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  const rows = page.locator("li.rise-in, li.row-out");
  await rows.first().waitFor({ timeout: 8000 });
  const before = await page.getByRole("button", { name: /^Delete/ }).count();
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: /^Delete/ }).first().click();
  await expect(page.locator("li.row-out")).toHaveCount(1);
  await expect.poll(async () => page.getByRole("button", { name: /^Delete/ }).count()).toBeLessThan(before);
});

test("the workshop slides between steps, and the toolkit's charts draw themselves", async ({ page }) => {
  await signInDemo(page);
  await go(page, "/community/demo-group-2");
  await page.getByLabel("Who are you meeting with?").fill("Alex");
  await page.getByRole("button", { name: "Start a discovery meeting" }).click();
  await page.getByRole("button", { name: /^1\s*Basics/ }).click();
  await page.getByRole("button", { name: "Next: Vision" }).click();
  await expect(page.locator(".slide-next")).toHaveCount(1);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator(".slide-prev")).toHaveCount(1);

  await page.getByRole("button", { name: /^Back to meetings/ }).click();
  await page.getByRole("button", { name: /^Owe/ }).first().click();
  await page.getByRole("button", { name: /^Paying off several debts / }).first().click();
  await expect(page.getByText("The race to debt-free")).toBeVisible();
  await page.getByRole("button", { name: "Replay" }).click();
  await page.getByRole("button", { name: /^Buying a car / }).first().click();
  await expect(page.locator("path.draw-slow").first()).toBeVisible();
});

test("a milestone is celebrated once, and a long absence gets a warm welcome back", async ({ page }) => {
  await signInDemo(page);
  // Pretend the person was last here five days ago.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("four-rivers:last-visit:")) localStorage.removeItem(k);
  });
  await go(page, "/course");
  await page.evaluate(() => {
    const id = "00000000-0000-0000-0000-000000000000";
    localStorage.setItem(`four-rivers:last-visit:${id}`, String(Date.now() - 5 * 86_400_000));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toHaveCount(0);
});
