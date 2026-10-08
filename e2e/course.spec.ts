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
  // A yes asks how it helped, and reminds them a testimony can touch someone.
  await expect(page.getByLabel("How did this help you? Tell us in a sentence or two.")).toBeVisible();
  await expect(page.getByText("Your testimony can impact someone's life.")).toBeVisible();
  // A "not really" asks what would make it better instead, without that line.
  await page.getByRole("button", { name: "Not really" }).click();
  await expect(page.getByText("Your testimony can impact someone's life.")).toBeHidden();
});

test("the feedback box can be skipped, and comes back on request", async ({ page }) => {
  await go(page, "/course/introduction/module/2");
  await expect(page.getByText("Did this lesson help you personally?")).toBeVisible();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByText("Did this lesson help you personally?")).toBeHidden();
  // It stays skipped on a reload, and another lesson still asks.
  await page.reload();
  await expect(page.getByText("Did this lesson help you personally?")).toBeHidden();
  await page.getByRole("button", { name: "Give feedback on this lesson" }).click();
  await expect(page.getByText("Did this lesson help you personally?")).toBeVisible();
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

test("a quiz explains the answers it got wrong, and lets you practice just those", async ({ page }) => {
  await go(page, "/course/river/1/quiz");
  // Pick the first option everywhere, then submit.
  const names = await page.locator('input[type="radio"]').evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLInputElement).name))]);
  expect(names).toHaveLength(10);
  for (const name of names) await page.locator(`input[type="radio"][name="${name}"]`).first().check();
  await page.getByRole("button", { name: "Submit quiz" }).click();

  // Every miss shows why, with the lesson's verse and a link back.
  await expect(page.getByText("Why this answer").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Read it again:/ }).first()).toBeVisible();

  // Practice only the ones missed: fewer questions, and it says nothing is saved.
  const practice = page.getByRole("button", { name: /Practice the ones I missed \((\d+)\)/ });
  const label = (await practice.innerText()).match(/\((\d+)\)/)![1];
  await practice.click();
  await expect(page.getByText("Practice only: this does not change your score.").first()).toBeVisible();
  await expect(page.locator('input[type="radio"]').evaluateAll((els) => new Set(els.map((e) => (e as HTMLInputElement).name)).size)).resolves.toBe(Number(label));
  for (const name of await page.locator('input[type="radio"]').evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLInputElement).name))]))
    await page.locator(`input[type="radio"][name="${name}"]`).last().check();
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(page.getByText(/this time\./)).toBeVisible();
});

test("money moments open from the course home, with verses and things to try", async ({ page }) => {
  await go(page, "/course");
  await expect(page.getByRole("heading", { name: "Money moments" })).toBeVisible();
  await page.getByRole("link", { name: /Buying a car/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Buying a car");
  await expect(page.getByRole("heading", { name: "What Scripture says" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try this week" })).toBeVisible();
  await expect(page.getByText("not personal financial advice")).toBeVisible();
  await page.getByRole("link", { name: /Read: Credit and debt in Scripture/ }).click();
  await expect(page).toHaveURL(/\/course\/introduction\/module\/7$/);
});

test("the 30-Day Challenge can be added to a calendar", async ({ page }) => {
  await go(page, "/challenge");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add the 30 days to my calendar" }).click();
  const file = await download;
  const text = (await import("node:fs")).readFileSync((await file.path())!, "utf8");
  expect((text.match(/BEGIN:VEVENT/g) ?? []).length).toBe(30);
  // Long lines are folded in the file; unfold them to read the text.
  expect(text.replace(/\r\n /g, "")).toContain("Day 30");
});
