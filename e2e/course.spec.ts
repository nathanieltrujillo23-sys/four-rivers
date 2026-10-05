import { expect, test } from "@playwright/test";
import { go, signInDemo } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await signInDemo(page);
});

test("the budget calculator adds up what you type", async ({ page }) => {
  await go(page, "/course/introduction/module/5");
  const amounts = page.locator('input[type="number"]');
  await amounts.nth(0).fill("2600"); // income
  await amounts.nth(1).fill("1500"); // needs
  await expect(page.getByText("$2,600.00").first()).toBeVisible();
  await expect(page.getByText("58% of income")).toBeVisible();
});

test("lessons can be searched, and opened from the results", async ({ page }) => {
  await go(page, "/search?q=budget");
  await expect(page.getByRole("status")).toContainText("lesson");
  await page
    .getByRole("link", { name: /Budgeting/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/course\/introduction\/module\/\d+/);
});

test("a lesson asks whether it helped and remembers the answer", async ({ page }) => {
  await go(page, "/course/introduction/module/1");
  await page.getByRole("button", { name: "Yes, it helped" }).click();
  await expect(page.getByText("Thank you. Your answer is saved.")).toBeVisible();
});

test("the glossary can be filtered", async ({ page }) => {
  await go(page, "/glossary");
  await page.getByPlaceholder("Search the glossary").fill("interest");
  await expect(page.getByText(/\d+ terms?/)).toBeVisible();
});
