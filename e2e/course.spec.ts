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

test("a two-week pace lays out the course and can be added to a calendar", async ({ page }) => {
  // The demo account is on the two-week pace (where the old 30-day challenge moved).
  await go(page, "/challenge");
  await expect(page.getByRole("heading", { level: 1, name: /Day 1 of 14/ })).toBeVisible();
  await expect(page.getByText("Day 14: Final Exam")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add the plan to my calendar" }).click();
  const file = await download;
  const text = (await import("node:fs")).readFileSync((await file.path())!, "utf8");
  expect((text.match(/BEGIN:VEVENT/g) ?? []).length).toBe(14);
  // Long lines are folded in the file; unfold them to read the text.
  expect(text.replace(/\r\n /g, "")).toContain("Day 14");

  // switching to one week keeps the start and shortens the plan
  await page.getByRole("button", { name: "Switch to one week" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Day 1 of 7/ })).toBeVisible();
  await expect(page.getByText("Day 7: Final Exam")).toBeVisible();

  // choosing a different pace goes back to the three choices
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Choose a different pace" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Choose your pace" })).toBeVisible();
  await page.getByRole("button", { name: /At my own pace/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "You're going at your own pace" })).toBeVisible();
  await page.getByRole("button", { name: /In two weeks/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Day 1 of 14/ })).toBeVisible();
});

test("30 Days of Practice: today opens, a day is checked off with a note, and undone", async ({ page }) => {
  // The demo account passed the exam, started practice four days ago and did days 1-3.
  await go(page, "/practice");
  await expect(page.getByRole("heading", { level: 1, name: "30 Days of Practice" })).toBeVisible();
  await expect(page.getByText("Day 5 of 30")).toBeVisible();
  await expect(page.getByText("Set aside part of today with no earning and no spending.", { exact: false })).toBeVisible();
  await expect(page.getByText("Exodus 20:9-10")).toBeVisible();
  await page.getByLabel(/A note for yourself/).fill("A quiet Sunday");
  await page.getByRole("button", { name: "I did this" }).click();
  await expect(page.getByText("4 of 30 days done").first()).toBeVisible();
  await expect(page.getByText("“A quiet Sunday”")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("3 of 30 days done").first()).toBeVisible();
  // another day opens on its own
  await page.getByRole("button", { name: /Day 9.*Save first/ }).click();
  await expect(page.getByText(/Move any amount, even \$5/)).toBeVisible();
});

test("a spaced review comes due after a quiz, is answered, checked and marked done", async ({ page }) => {
  // The demo account passed River 1's quiz a week ago, so its first review is waiting on the course home.
  await go(page, "/course");
  const card = page.getByRole("link", { name: /A quick review is ready/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("River 1");
  await card.click();
  await expect(page.getByText("River 1 · review the next day")).toBeVisible();
  const check = page.getByRole("button", { name: "Check my answers" });
  await expect(check).toBeDisabled();
  for (const group of await page.locator("fieldset").all()) await group.getByRole("radio").first().check();
  await check.click();
  await expect(page.getByRole("status")).toContainText(/of 3 right|All 3 right/);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/course$/);
  // the next one waiting is the earliest still due: River 2's first review
  await expect(page.getByRole("link", { name: /A quick review is ready/ })).toContainText("River 2");
});

test("Introduction lessons can be listened to, with the keep-listening option", async ({ page }) => {
  await go(page, "/course/introduction/module/1");
  const bar = page.getByRole("region", { name: "Read lesson aloud" });
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: /Listen to this lesson/ })).toBeVisible();
});
