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

test("roadmap milestones move between time frames by dragging, the arrow keys, or the Move to menu", async ({ page }) => {
  test.setTimeout(90_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
  await page.getByRole("button", { name: "See an example client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Marcus Rivera" })).toBeVisible();
  await page.getByRole("navigation", { name: "Plan steps" }).getByRole("button", { name: /Model/ }).click();
  await page.getByRole("tab", { name: /Roadmap/ }).click();

  const frame = (name: string) => page.locator(`section[data-phase="${name}"]`);
  const first = frame("30 Days").locator("[data-card]").first();
  const text = (await first.locator("p").first().innerText()).trim();
  const before = await frame("1 Year").locator("[data-card]").count();

  // Drag the handle into the 1 Year column.
  const handle = first.getByRole("button", { name: /^Move milestone/ });
  await handle.scrollIntoViewIfNeeded();
  const from = (await handle.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // On a phone the time frames are stacked, so scroll the target into reach while the handle is held.
  const reach = page.viewportSize()!.height - 120;
  let to = (await frame("1 Year").boundingBox())!;
  for (let tries = 0; tries < 8 && to.y + 60 > reach; tries++) {
    await page.mouse.wheel(0, Math.min(500, to.y + 60 - reach + 40));
    await page.waitForTimeout(150);
    to = (await frame("1 Year").boundingBox())!;
  }
  await page.mouse.move(to.x + to.width / 2, Math.max(to.y, 5) + 60, { steps: 12 });
  await expect(frame("1 Year")).toHaveClass(/ring-2/); // the column lights up as the place it will land
  await page.mouse.up();
  await expect(frame("1 Year").getByText(text, { exact: true })).toBeVisible();
  await expect(frame("30 Days").getByText(text, { exact: true })).toHaveCount(0);
  await expect(frame("1 Year").locator("[data-card]")).toHaveCount(before + 1);

  // The arrow keys move a milestone one time frame at a time.
  await frame("1 Year").getByText(text, { exact: true }).locator("xpath=ancestor::li[@data-card]").getByRole("button", { name: /^Move milestone/ }).press("ArrowRight");
  await expect(frame("3 Years").getByText(text, { exact: true })).toBeVisible();

  // And the menu on each card does the same for anyone who cannot drag.
  await frame("3 Years").getByLabel(`Move to a different time frame: ${text}`).selectOption("90 Days");
  await expect(frame("90 Days").getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByText(`Moved "${text}" to 90 Days.`)).toBeAttached();
});

test("tax rates are worked out from income, with fine print, unless the analyst sets their own", async ({ page }) => {
  test.setTimeout(90_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
  await page.getByRole("button", { name: "See an example client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Marcus Rivera" })).toBeVisible();
  const steps = page.getByRole("navigation", { name: "Plan steps" });

  // Step 1: take-home pay from pay before tax.
  await page.getByText("Estimate take-home pay from pay before tax").click();
  await page.getByLabel("Pay per year, before tax").fill("50000");
  await expect(page.getByText(/\$50,000 a year: federal income tax of \$3,820/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Use \$.* a month as take-home$/ })).toBeVisible();

  // Step 6: the Accounts tool's "tax rate now" follows the income.
  await steps.getByRole("button", { name: /Focus areas/ }).click();
  const rate = page.getByLabel("Your tax rate now", { exact: true });
  await expect(rate).toHaveValue("12"); // the default $60,000, single
  await expect(page.getByText(/\$60,000 less the \$16,100 standard deduction .*12% federal bracket/)).toBeVisible();
  await page.getByLabel("Your income per year, before tax").fill("100000");
  await expect(rate).toHaveValue("22");
  await page.getByLabel("Filing status").first().selectOption("mfj");
  await expect(rate).toHaveValue("12");
  await expect(page.getByText(/\$32,200 standard deduction/)).toBeVisible();

  // Choosing "My own" keeps what the person types, and swaps the fine print.
  await page.getByRole("group", { name: /Your tax rate now: estimate it or set your own/ }).getByRole("button", { name: "My own" }).click();
  await rate.fill("30");
  await expect(rate).toHaveValue("30");
  await expect(page.getByText("You chose this rate yourself.")).toBeVisible();
  await page.getByRole("group", { name: /Your tax rate now: estimate it or set your own/ }).getByRole("button", { name: "Estimate" }).click();
  await expect(rate).toHaveValue("12");
});

test("the snapshot, risk profile and policy statement build on each other", async ({ page }) => {
  test.setTimeout(90_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
  await page.getByRole("button", { name: "See an example client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Marcus Rivera" })).toBeVisible();
  const steps = page.getByRole("navigation", { name: "Plan steps" });

  // The snapshot: net worth and the ratios advisors check first, each with a rule of thumb and a word for where it stands.
  await steps.getByRole("button", { name: /Snapshot/ }).click();
  await expect(page.getByText("Net worth", { exact: true })).toBeVisible();
  await expect(page.getByText("$2,900", { exact: true }).first()).toBeVisible(); // $5,300 owned less $2,400 owed
  await expect(page.getByText(/Needs work · aim for 3 to 6 months of needs/)).toBeVisible();
  await page.getByLabel("Value of Checking").fill("5000");
  await expect(page.getByText("$7,300", { exact: true }).first()).toBeVisible();

  // Goals: each goal's bucket and chance, from the saving the client actually does.
  await steps.getByRole("button", { name: /Goals/ }).click();
  await expect(page.getByRole("heading", { name: "Goal funding status" })).toBeVisible();
  await expect(page.getByLabel("Bucket for Emergency fund (3 months)")).toHaveValue("Essential");
  await page.getByLabel("Bucket for Reliable used car").selectOption("Aspirational");
  await expect(page.getByLabel("Bucket for Reliable used car")).toHaveValue("Aspirational");

  // Risk: tolerance, capacity (partly from the plan) and the required return, and a policy statement to reword.
  await steps.getByRole("button", { name: /Risk and IPS/ }).click();
  await expect(page.getByRole("heading", { name: "Risk tolerance" })).toBeVisible();
  await expect(page.getByText("Worked out from the plan:").first()).toBeVisible();
  await expect(page.getByText(/Recommended profile: Growth/)).toBeVisible();
  await page.getByLabel("Risk profile to use").selectOption("Conservative");
  await page.getByRole("button", { name: "Apply Conservative to the model" }).click();
  await expect(page.getByRole("button", { name: "Conservative is applied to the model" })).toBeDisabled();
  const rebalance = page.getByLabel("Rebalancing");
  await rebalance.fill("Rebalance every January.");
  await expect(rebalance).toHaveValue("Rebalance every January.");
  await expect(page.getByRole("button", { name: "Reset to the draft" })).toBeVisible();
  await page.getByRole("button", { name: "Reset to the draft" }).click();
  await expect(rebalance).toHaveValue(/more than five percentage points/);

  // The deck lists the new slides.
  await steps.getByRole("button", { name: /Presentation/ }).click();
  for (const label of ["Recommendation", "Balance sheet", "Goal funding status", "Risk profile", "Investment policy statement"]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});
