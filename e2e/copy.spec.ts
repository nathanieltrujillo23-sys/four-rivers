import { expect, test, type Page } from "@playwright/test";
import { acceptDialogs, go, signInDemo } from "./helpers.js";

/** Pretends the database holds these reworded pieces of text (what Admin, Content saves). */
async function reword(page: Page, overrides: Record<string, string>) {
  await page.route("**/rest/v1/site_text*", async (route) => {
    const url = route.request().url();
    if (route.request().method() === "GET" && url.includes("like.copy")) {
      await route.fulfill({
        json: Object.entries(overrides).map(([k, text]) => ({ id: `copy:${k}`, content: { text } })),
      });
    } else await route.continue();
  });
}

test.beforeEach(async ({ page }) => {
  acceptDialogs(page);
});

test("reworded text shows on the home page, a money moment, and a quiz", async ({ page }) => {
  await reword(page, {
    "home:learn.1": "Edited home card for river one.",
    "moment:buying-a-car:title": "Edited car title",
    "moment:buying-a-car:hook": "Edited car opening line.",
    "moment:buying-a-car:s0:body": "Edited first paragraph.\n\nEdited second paragraph.",
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`explain:1:${i}`, `Edited reason ${i}`])),
  });
  await page.goto("/");
  await expect(page.getByText("Edited home card for river one.")).toBeVisible();

  await signInDemo(page);
  await go(page, "/course");
  await expect(page.getByRole("link", { name: /Edited car title/ })).toBeVisible();
  await go(page, "/course/moments/buying-a-car");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Edited car title");
  await expect(page.getByText("Edited car opening line.")).toBeVisible();
  await expect(page.getByText("Edited first paragraph.")).toBeVisible();
  await expect(page.getByText("Edited second paragraph.")).toBeVisible();

  await go(page, "/course/river/1/quiz");
  const names = await page.locator('input[type="radio"]').evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLInputElement).name))]);
  for (const n of names) await page.locator(`input[type="radio"][name="${n}"]`).first().check();
  await page.getByRole("button", { name: "Submit quiz" }).click();
  await expect(page.locator('[role="note"]').getByText(/^Edited reason \d$/).first()).toBeVisible();
});

test("reworded text shows in the discovery workshop and the money toolkit", async ({ page }) => {
  await reword(page, {
    "workshop:intro": "Edited workshop introduction.",
    "workshop:step:basics:title": "Edited first step",
    "workshop:step:basics:prompt": "Edited first question?",
    "workshop:field:basics.notes:label": "Edited notes box",
    "workshop:topic:car": "Edited car topic",
    "toolkit:page:intro": "Edited toolkit introduction.",
    "toolkit:section:live:title": "Edited Live name",
    "toolkit:section:live:text": "Edited Live description.",
    "toolkit:tool:wishes:title": "Edited wish planner",
    "toolkit:intro:wishes:0": "Edited wish planner introduction.",
    "toolkit:note:car:0": "Edited car note.",
    "toolkit:note:will:0": "Edited estate reminder.",
  });
  await signInDemo(page);
  await go(page, "/community/demo-group-2");
  await expect(page.getByText("Edited workshop introduction.")).toBeVisible();
  await expect(page.getByText("Edited toolkit introduction.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Edited Live name/ })).toBeVisible();
  await expect(page.getByText("Edited Live description.")).toBeVisible();

  await page.getByRole("button", { name: /^Edited Live name/ }).click();
  await page.getByRole("button", { name: /^Edited wish planner / }).click();
  await expect(page.getByText("Edited wish planner introduction.")).toBeVisible();

  await page.getByRole("button", { name: /^Owe/ }).first().click();
  await page.getByRole("button", { name: /^Buying a car / }).first().click();
  await expect(page.getByText("Edited car note.")).toBeVisible();

  await page.getByRole("button", { name: /^Estate planning/ }).first().click();
  await page.getByRole("button", { name: /^Last will and testament / }).first().click();
  await expect(page.getByText("Edited estate reminder.")).toBeVisible();

  // And in a meeting.
  await page.getByLabel("Who are you meeting with?").fill("Alex");
  await page.getByRole("button", { name: "Start a discovery meeting" }).click();
  await expect(page.getByRole("heading", { name: /Step 1: Edited first step/ })).toBeVisible();
  await expect(page.getByText("Edited first question?")).toBeVisible();
  await expect(page.getByLabel("Edited notes box")).toBeVisible();
  await page.getByRole("button", { name: /^6\s*Recap/ }).click();
  await expect(page.getByRole("button", { name: "Edited car topic", exact: true })).toBeVisible();
});

test("without any rewording, the shipped text shows", async ({ page }) => {
  await reword(page, {});
  await signInDemo(page);
  await go(page, "/community/demo-group-2");
  await expect(page.getByRole("button", { name: /^Live/ }).first()).toBeVisible();
  await expect(page.getByText("Thirty tools in six sections")).toBeVisible();
});
