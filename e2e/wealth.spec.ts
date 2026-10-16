import { expect, test } from "@playwright/test";
import { go, signInDemo } from "./helpers.js";

test("a person asks for wealth tools beside the leader request, and it shows as requested", async ({ page }) => {
  test.setTimeout(90_000);
  // The guided tour's sample learner has neither leader status nor wealth tools yet.
  await page.goto("/");
  await page.getByRole("button", { name: "Show me around" }).click();
  const dialog = page.getByRole("dialog", { name: "Guided tour" });
  await expect(dialog).toBeVisible();
  for (let i = 1; i < 7; i++) await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByText("Step 7 of 10")).toBeVisible();

  const leader = page.getByRole("button", { name: "Request leader status" });
  const wealth = page.getByRole("button", { name: "Request wealth tools" });
  await expect(leader).toBeVisible();
  await expect(wealth).toBeVisible();
  // "Request wealth tools" sits to the right of "Request leader status", on the same row where there is room.
  const a = (await leader.boundingBox())!;
  const b = (await wealth.boundingBox())!;
  if (page.viewportSize()!.width >= 600) {
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    expect(Math.abs(b.y - a.y)).toBeLessThan(a.height);
  }

  // The tour's overlay sits over the page, so the buttons are pressed directly.
  await wealth.evaluate((el) => (el as HTMLButtonElement).click());
  await page.getByRole("button", { name: "Send request" }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.getByText("Wealth tools requested. An admin will review it soon.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request wealth tools" })).toHaveCount(0);
});

test("an approved analyst takes a client from discovery to a downloadable presentation", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community");
  await expect(page.getByRole("link", { name: "Open wealth tools" })).toBeVisible();
  await expect(page.getByText("Tools group · private to you")).toBeVisible();
  await page.getByRole("link", { name: "Open wealth tools" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Wealth Tools" })).toBeVisible();
  await expect(page.getByText("Only you can see your clients' plans")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your clients (0)" })).toBeVisible();

  // Start a client from the example, so every step has something in it.
  await page.getByRole("button", { name: "See an example client" }).click();
  await expect(page).toHaveURL(/\/community\/wealth\/.+/);
  await expect(page.getByRole("heading", { level: 1, name: "Marcus Rivera" })).toBeVisible();
  const steps = page.getByRole("navigation", { name: "Plan steps" });

  // Step 1 keeps the notes from the discovery meeting.
  await expect(page.getByLabel("Discovery meeting notes")).toHaveValue(/Daily Bread study/);
  await steps.getByRole("button", { name: /Goals/ }).click();
  await expect(page.getByText("Total needed")).toBeVisible();

  // Step 6: the client's 2 or 3 areas, each with its tool open for the real numbers.
  await steps.getByRole("button", { name: /Focus areas/ }).click();
  await expect(page.getByRole("heading", { name: "1. Paying off debt" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. Investing in the markets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Buying a house" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buying a car, chosen" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Taking a vacation", pressed: false })).toBeDisabled().catch(() => {});

  // Step 7: the financial model.
  await steps.getByRole("button", { name: /Model/ }).click();
  await expect(page.getByText("Chance of success")).toBeVisible();
  await expect(page.getByRole("img", { name: /Projected balance over 35 years/ })).toBeVisible();

  // Step 8: the presentation, and the download.
  await steps.getByRole("button", { name: /Presentation/ }).click();
  await expect(page.getByRole("heading", { name: "What goes in the deck" })).toBeVisible();
  await expect(page.getByText(/\d+ slides/).first()).toBeVisible();
  await expect(page.getByText("Paying off several debts")).toBeVisible();
  await page.getByLabel("Presented by").fill("Test Analyst");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PowerPoint (.pptx)" }).click()]);
  expect(download.suggestedFilename()).toBe("Marcus-Rivera-Wealth-Plan.pptx");
  const path = await download.path();
  const { statSync } = await import("node:fs");
  expect(statSync(path).size).toBeGreaterThan(30_000);

  // The one-page brief is still there to print.
  await page.getByRole("button", { name: "Show the one-page brief" }).click();
  await expect(page.locator("#wealth-brief")).toContainText("Marcus Rivera");

  // Back on the list, the client shows with their focus areas, and can be deleted.
  await go(page, "/community/wealth");
  await expect(page.getByRole("heading", { name: "Your clients (1)" })).toBeVisible();
  await expect(page.getByLabel("Focus areas").getByText("Buying a house")).toBeVisible();
  await page.getByRole("button", { name: /Delete Marcus Rivera plan/ }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("heading", { name: "Your clients (0)" })).toBeVisible();
});

test("a second client's plan and numbers stay separate from the first", async ({ page }) => {
  test.setTimeout(90_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
  for (const name of ["Jordan Lee", "Priya Shah"]) {
    await page.getByLabel("Start a client plan").fill(name);
    await page.getByRole("button", { name: "Start plan" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    const steps = page.getByRole("navigation", { name: "Plan steps" });
    await steps.getByRole("button", { name: /Goals/ }).click();
    await page.getByLabel("Goal name").fill(`${name.split(" ")[0]}'s goal`);
    await page.getByLabel("Target").fill("5000");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByLabel(`Name of ${name.split(" ")[0]}'s goal`)).toBeVisible();
    await go(page, "/community/wealth");
  }
  await expect(page.getByRole("heading", { name: "Your clients (2)" })).toBeVisible();
  await page.getByRole("link", { name: "Open" }).first().click();
  await expect(page).toHaveURL(/\/community\/wealth\/.+/);
  await expect(page.getByText("Client plan", { exact: true })).toBeVisible();
  const first = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  await page.getByRole("navigation", { name: "Plan steps" }).getByRole("button", { name: /Goals/ }).click();
  const mine = first.split(" ")[0];
  await expect(page.getByLabel(`Name of ${mine}'s goal`)).toBeVisible();
  const otherName = mine === "Jordan" ? "Priya" : "Jordan";
  await expect(page.getByLabel(`Name of ${otherName}'s goal`)).toHaveCount(0);
});
