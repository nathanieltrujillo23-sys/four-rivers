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

test("the dashboard gathers every calculator and opens one on a tap", async ({ page }) => {
  await go(page, "/dashboard");
  await expect(page.getByRole("heading", { name: "Calculators" })).toBeVisible();
  for (const name of ["Monthly budget", "Time and money", "Another stream", "Savings growth", "Investment growth", "Dollar today vs. later"]) {
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  }
  const tile = page.getByRole("button", { name: /Savings growth/ });
  await tile.click();
  await expect(tile).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "Savings growth example" })).toBeVisible();
  await tile.click();
  await expect(page.getByRole("heading", { name: "Savings growth example" })).toBeHidden();
});

test("a calculator scenario can be saved, changed, and brought back", async ({ page }) => {
  await go(page, "/dashboard");
  await page.getByRole("button", { name: /Savings growth/ }).click();
  const monthly = page.getByLabel(/Monthly/i).first();
  await monthly.fill("250");
  await page.getByPlaceholder("Name this scenario").fill("Bigger deposits");
  await page.getByRole("button", { name: "Save scenario" }).click();
  await expect(page.getByText("Saved. Tap its name any time to bring it back.")).toBeVisible();
  await monthly.fill("10");
  await page.getByRole("button", { name: "Bigger deposits", exact: true }).click();
  await expect(page.getByLabel(/Monthly/i).first()).toHaveValue("250");
  await page.getByRole("button", { name: "Delete Bigger deposits" }).click();
  await expect(page.getByRole("button", { name: "Bigger deposits", exact: true })).toBeHidden();
});

test("the certificate can be turned into an image for sharing", async ({ page }, info) => {
  // On a phone the button opens the system share sheet instead of saving a file.
  test.skip(info.project.name === "phone", "uses the share sheet on touch devices");
  await go(page, "/certificate");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Image for LinkedIn" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("4-rivers-certificate.png");
  await expect(page.getByText("Saved to your downloads.")).toBeVisible();
});
