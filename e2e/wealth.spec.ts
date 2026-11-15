import { expect, test } from "@playwright/test";
import { go, signInDemo } from "./helpers.js";
import { FEATURES } from "../src/lib/features.js";

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
  // Leader status belongs to the groups half; the tool sets are asked for in the Daily Bread half.
  await expect(page.getByRole("region", { name: "Groups" }).getByRole("button", { name: "Request leader status" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Members' space" }).getByRole("button", { name: "Request wealth tools" })).toBeVisible();

  // The tour's overlay sits over the page, so the buttons are pressed directly.
  await wealth.evaluate((el) => (el as HTMLButtonElement).click());
  await page.getByRole("button", { name: "Send request" }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.getByText("Wealth tools requested. An admin will review it soon.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Request wealth tools" })).toHaveCount(0);

  // Investment banking tools and consulting tools follow, in that order, and are asked for the same way.
  const ib = page.getByRole("button", { name: "Request investment banking tools" });
  const consulting = page.getByRole("button", { name: "Request consulting tools" });
  await expect(ib).toBeVisible();
  await expect(consulting).toBeVisible();
  const c1 = (await ib.boundingBox())!;
  const c2 = (await consulting.boundingBox())!;
  expect(c2.y > c1.y + c1.height - 1 || c2.x > c1.x + c1.width - 1).toBe(true);
  await ib.evaluate((el) => (el as HTMLButtonElement).click());
  await page.getByRole("button", { name: "Send request" }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.getByText("Investment banking tools requested. An admin will review it soon.")).toBeVisible();
  await page.getByRole("button", { name: "Request consulting tools" }).evaluate((el) => (el as HTMLButtonElement).click());
  await page.getByRole("button", { name: "Send request" }).evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.getByText("Consulting tools requested. An admin will review it soon.")).toBeVisible();
});

test("investment banking tools: valuation models, technical questions, a deal log and recruiting", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community");
  // The links are in order: wealth tools, then investment banking, then consulting.
  const links = await page.getByRole("link", { name: /^Open (wealth|investment banking|consulting) tools$/ }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  expect(links).toEqual(["Open wealth tools", "Open investment banking tools", "Open consulting tools"]);
  await page.getByRole("link", { name: "Open investment banking tools" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Investment Banking Tools" })).toBeVisible();

  // DCF: a value, the working, and a refusal when WACC is not above growth.
  await expect(page.getByText("Enterprise value").first()).toBeVisible();
  await page.getByText("How this was calculated", { exact: true }).click();
  await expect(page.getByText(/Unlevered free cash flow = NOPAT/)).toBeVisible();
  await page.getByLabel(/^WACC/).fill("2");
  await expect(page.getByRole("alert").filter({ hasText: /must be higher than the terminal growth/ })).toBeVisible();
  await page.getByLabel(/^WACC/).fill("9");

  // Comparables: add two companies and a target.
  await page.getByRole("tab", { name: "Comparables" }).click();
  for (const [name, ev, ebitda] of [["Alpha", "1000", "100"], ["Beta", "1200", "100"]]) {
    await page.getByRole("button", { name: "Add a company" }).click();
    const n = (await page.getByLabel(/^Company \d+ name$/).count()) as number;
    await page.getByLabel(`Company ${n} name`).fill(name);
    await page.getByLabel(`${name} enterprise value`).fill(ev);
    await page.getByLabel(`${name} EBITDA`).fill(ebitda);
  }
  await page.getByLabel(/^Target EBITDA/).fill("50");
  await expect(page.getByText(/Enterprise value/).first()).toBeVisible();

  // The football field sits above the models once they have numbers.
  await expect(page.getByRole("img", { name: /Football field/ })).toBeVisible();

  // LBO and accretion/dilution show their results.
  await page.getByRole("tab", { name: "LBO", exact: true }).click();
  await expect(page.getByText("IRR", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Accretion and dilution" }).click();
  await expect(page.getByText(/Accretion|Dilution/).first()).toBeVisible();
  // Three statements balance, and changing D&A keeps them balanced.
  await page.getByRole("tab", { name: "Three statements" }).click();
  await expect(page.getByText(/balance sheet balances in every year/)).toBeVisible();
  await page.getByLabel("D&A, % of revenue").fill("6");
  await expect(page.getByText(/balance sheet balances in every year/)).toBeVisible();

  // WACC: a textbook case, then a beta built from a comparable, then handed to the DCF.
  await page.getByRole("tab", { name: "WACC", exact: true }).click();
  await page.getByLabel(/^Risk-free rate/).fill("4");
  await page.getByLabel(/^Levered beta/).fill("1.2");
  await page.getByLabel(/^Pre-tax cost of debt/).fill("6");
  await page.getByLabel(/^Equity value/).fill("600");
  await page.getByLabel(/^Debt/).fill("400");
  await expect(page.getByText("7.80%").first()).toBeVisible();
  await page.getByLabel(/Take beta from comparables/).check();
  await page.getByRole("button", { name: "Add a peer" }).click();
  await page.getByLabel("Peer 1 name").fill("Peer One");
  await page.getByLabel("Peer One levered beta").fill("1.5");
  await page.getByLabel("Peer One debt to equity percent").fill("100");
  await expect(page.getByText(/relevered from 0\.86/)).toBeVisible();
  await page.getByRole("button", { name: "Use this WACC in the DCF" }).click();
  await expect(page.getByText(/The DCF now discounts at/)).toBeVisible();

  // Precedent transactions join the football field.
  await page.getByRole("tab", { name: "Precedents", exact: true }).click();
  await page.getByRole("button", { name: "Add a deal" }).click();
  await page.getByLabel("Deal 1 target").fill("Target One");
  await page.getByLabel("Target One deal enterprise value").fill("900");
  await page.getByLabel("Target One ebitda").fill("90");
  await page.getByLabel(/^Target EBITDA/).fill("50");
  await expect(page.getByRole("img", { name: /Precedent transactions \$500\.0M to \$500\.0M/ })).toBeVisible();

  // The paper LBO drill marks five answers and shows the working.
  await page.getByRole("tab", { name: "Paper LBO drill", exact: true }).click();
  await page.getByRole("button", { name: "Start the clock" }).click();
  await page.getByLabel(/^Purchase price/).fill("1");
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(page.getByText(/of 5 in \d+:\d\d\./)).toBeVisible();
  await page.getByText("The working", { exact: true }).click();
  await expect(page.getByText(/Purchase price = EBITDA/)).toBeVisible();

  // Any model downloads as an Excel workbook with live formulas.
  await page.getByRole("tab", { name: "DCF", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export the DCF model to Excel" }).click();
  expect((await download).suggestedFilename()).toBe("DCF.xlsx");
  await expect(page.getByText(/Downloaded\. Blue cells are inputs/)).toBeVisible();

  // Technical questions: reveal and rate.
  await page.getByRole("tab", { name: "Technical questions" }).click();
  await page.getByRole("button", { name: /Show the answer: Walk me through the three financial statements/ }).click();
  await expect(page.getByText(/Net income flows to retained earnings/)).toBeVisible();
  await page.getByRole("group", { name: /Rate yourself: Walk me through the three financial statements/ }).getByRole("button", { name: "Confident" }).click();
  await expect(page.getByText("1 of 36")).toBeVisible();

  // Deal log and recruiting.
  await page.getByRole("tab", { name: "Deal log" }).click();
  await page.getByLabel("Company or deal").fill("Example Co acquisition");
  await page.getByRole("button", { name: "Add to the log" }).click();
  await expect(page.getByText("Example Co acquisition")).toBeVisible();
  await page.getByRole("tab", { name: "Recruiting" }).click();
  await page.getByRole("button", { name: "Add a firm" }).click();
  await page.getByLabel("Firm 1", { exact: true }).fill("Example Bank");
  await expect(page.getByLabel("Status at Example Bank")).toHaveValue("Researching");
});

test("consulting tools: frameworks, market sizing, profit and break-even, drills, stories and a practice log", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community");
  await page.getByRole("link", { name: "Open consulting tools" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Consulting Tools" })).toBeVisible();

  await page.getByRole("button", { name: "Market entry" }).click();
  await expect(page.getByText(/Barriers to entry/)).toBeVisible();
  await page.getByLabel("My structure for this case").fill("Market, competition, our ability, risks.");
  await page.getByRole("checkbox", { name: "I can set this up from memory" }).check();
  await expect(page.getByText("1 of 8")).toBeVisible();

  // A mock case: the interviewer shares data only when asked, and the numbers check out.
  await page.getByRole("tab", { name: "Mock case" }).click();
  await page.getByRole("button", { name: /Start the case: FreshMart/ }).click();
  await expect(page.getByText(/regional grocery chain/)).toBeVisible();
  await page.getByRole("button", { name: /Ask: Revenue over the two years/ }).click();
  await expect(page.getByText(/up 4 percent/)).toBeVisible();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByLabel("Your numeric answer").fill("74");
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Correct\./ })).toBeVisible();
  await page.getByRole("button", { name: "Start the case timer" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();

  await page.getByRole("tab", { name: "Market sizing" }).click();
  await page.getByRole("button", { name: /Start from: Cups of coffee/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /billion cups a year/ })).toBeVisible();
  await page.getByLabel("Its value").fill("100000000000");
  await expect(page.getByRole("status").filter({ hasText: /factor of two|higher|lower/ })).toBeVisible();

  await page.getByRole("tab", { name: "Profit and break-even" }).click();
  await expect(page.getByText("Break-even volume", { exact: true })).toBeVisible();
  await page.getByLabel("Price per unit").fill("40");
  await expect(page.getByText("40,000").first()).toBeVisible();

  await page.getByRole("tab", { name: "Math drills" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByLabel("Answer to question 1", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(page.getByRole("heading", { name: /Score: \d+ of 10/ })).toBeVisible();

  await page.getByRole("tab", { name: "Fit stories" }).click();
  await page.getByLabel("My story: Leadership").fill("Situation: our club had no plan. Task: lead it. Action: I set weekly goals and split the work among five people. Result: we doubled attendance in a semester.");
  await expect(page.getByText(/words \(about/).first()).toBeVisible();

  await page.getByRole("tab", { name: "Practice log" }).click();
  await page.getByRole("button", { name: "Add to the log" }).click();
  await expect(page.getByRole("button", { name: /Remove the Profitability case/ })).toBeVisible();
});

test("an approved analyst takes a client from discovery to a downloadable presentation", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community");
  await expect(page.getByRole("link", { name: "Open wealth tools" })).toBeVisible();
  await expect(page.getByText("Tools group · private to you")).toBeVisible();
  await page.getByRole("link", { name: "Open wealth tools" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Wealth Tools" })).toBeVisible();
  // Wealth Tools opens on three choices.
  await expect(page.getByRole("link", { name: /Do a case study/ })).toHaveAttribute("href", "/community/wealth/cases?tab=practice");
  await expect(page.getByRole("link", { name: /Use the tools/ })).toHaveAttribute("href", "/community/wealth/models");
  await page.getByRole("link", { name: /Work with a client or student/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your clients" })).toBeVisible();
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

  // The client handout is still there to print.
  await page.getByRole("button", { name: "Show the client handout" }).click();
  await expect(page.locator("#wealth-brief")).toContainText("Marcus Rivera");

  // Back on the list, the client shows with their focus areas, and can be deleted.
  await go(page, "/community/wealth/clients");
  await expect(page.getByRole("heading", { name: "Your clients (1)" })).toBeVisible();
  await expect(page.getByLabel("Focus areas").getByText("Buying a house")).toBeVisible();
  await page.getByRole("button", { name: /Delete Marcus Rivera plan/ }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("heading", { name: "Your clients (0)" })).toBeVisible();
});

test("a second client's plan and numbers stay separate from the first", async ({ page }) => {
  test.setTimeout(90_000);
  await signInDemo(page);
  await go(page, "/community/wealth/clients");
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
    await go(page, "/community/wealth/clients");
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
  await go(page, "/community/wealth/clients");
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
  await go(page, "/community/wealth/clients");
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
  await go(page, "/community/wealth/clients");
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
  for (const label of ["Key takeaways and options", "Balance sheet", "Goal funding status", "Risk profile", "Investment policy statement"]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});

test("the portfolio step builds from assumptions the analyst enters, with guidelines, and the retirement income phase runs", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth/clients");
  await page.getByRole("button", { name: "See an example client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Marcus Rivera" })).toBeVisible();
  const steps = page.getByRole("navigation", { name: "Plan steps" });
  await steps.getByRole("button", { name: /Portfolio/ }).click();

  // Assumptions: placeholders are labelled as such, with guidelines and where to look.
  await expect(page.getByText("The starting numbers are round, illustrative placeholders.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to choose assumptions" })).toBeVisible();
  await expect(page.getByText("J.P. Morgan Asset Management: Long-Term Capital Market Assumptions")).toBeVisible();
  await page.getByLabel("Source (name and year)").fill("Test source 2026");
  await page.getByLabel("Expected return of US large cap stocks").fill("7");

  // Allocation: weights, the stats they imply, and a button that puts them in the model.
  await page.getByRole("tab", { name: "Allocation" }).click();
  await expect(page.getByText("Total 100%")).toBeVisible();
  await page.getByLabel("Weight of Cash").fill("10");
  await expect(page.getByText("Total 105%")).toBeVisible();
  await page.getByRole("button", { name: "Scale to 100%" }).click();
  await expect(page.getByText("Total 100%")).toBeVisible();
  await page.getByRole("button", { name: "Use this portfolio in the model" }).click();
  await expect(page.getByRole("button", { name: "These assumptions are in the model" })).toBeDisabled();

  // The frontier, stress tests, and fees.
  await page.getByRole("tab", { name: "Efficient frontier" }).click();
  await expect(page.getByRole("img", { name: /Efficient frontier: compound return against volatility/ })).toBeVisible();
  await page.getByRole("tab", { name: "Stress tests" }).click();
  await expect(page.getByText("2008 financial crisis")).toBeVisible();
  await page.getByLabel("Portfolio value to test").fill("100000");
  await expect(page.getByText(/\(\$\d+,\d{3}\)/).first()).toBeVisible();
  await page.getByRole("tab", { name: "Fees and rebalancing" }).click();
  await expect(page.getByRole("heading", { name: "What fees cost over time" })).toBeVisible();
  await expect(page.getByText(/sell \$|buy \$/).first()).toBeVisible();

  // Retirement income, in the Model step.
  await steps.getByRole("button", { name: /Model/ }).click();
  await page.getByRole("tab", { name: /Retirement income/ }).click();
  await expect(page.getByText("Chance the money lasts")).toBeVisible();
  await expect(page.getByRole("img", { name: /Balance by age/ })).toBeVisible();
  await page.getByLabel("Yearly spending in retirement").fill("30000");
  await expect(page.getByText("Chance the money lasts")).toBeVisible();

  // The presentation now lists the investment slides.
  await steps.getByRole("button", { name: /Presentation/ }).click();
  for (const label of ["Asset allocation", "Stress tests", "Fees and rebalancing", "Retirement income"]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});

test("career prep: questions, practice clients, a market journal, a tracker, and resume bullets from real work", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
  await page.getByRole("link", { name: /Interview and career prep/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Interview and career prep" })).toBeVisible();

  // Technical questions: reveal an answer after trying it, then rate yourself.
  const q = page.getByText("What is the relationship between bond prices and interest rates?");
  await expect(q).toBeVisible();
  const card = page.locator("li").filter({ has: q });
  await card.getByRole("button", { name: "Show the answer" }).click();
  await expect(card.getByText(/opposite directions/)).toBeVisible();
  await card.getByRole("button", { name: "Confident" }).click();
  await expect(page.getByText("1 of 37")).toBeVisible();

  // Behavioral: an answer is kept and counted.
  await page.getByRole("tab", { name: "Behavioral" }).click();
  await page.getByLabel("Why wealth management, and why private banking?").fill("Because I have seen how a clear plan lowers the stress of money for people I care about, and I want to do that work every day.");
  await expect(page.getByText(/words$/).first()).toBeVisible();

  // Practice clients: a script to role-play, a rubric to score, and a plan to start.
  await page.getByRole("tab", { name: "Practice clients" }).click();
  await page.getByRole("button", { name: /Chris Navarro/ }).click();
  await page.getByRole("button", { name: "Reveal what the client says" }).first().click();
  await expect(page.getByText(/That is a|If the stock drops|\$420,000/).first()).toBeVisible();
  await page.getByLabel("Your recommendation, in a paragraph").fill("Diversify the employer stock gradually and give appreciated shares through a donor-advised fund, while funding the 529 plans.");
  await page.getByRole("checkbox", { name: /names concentration/i }).check();

  // Journal, readiness and tracker.
  await page.getByRole("tab", { name: "Market journal" }).click();
  await page.getByLabel("My view of the markets this week").fill("Rates are the story: the market is pricing cuts that the data does not yet support.");
  await page.getByRole("button", { name: "Add the entry" }).click();
  await expect(page.getByText("Rates are the story")).toBeVisible();
  await page.getByRole("tab", { name: "Readiness" }).click();
  await page.getByRole("checkbox", { name: /Keeps a weekly market journal/ }).check();
  await page.getByRole("tab", { name: "Applications" }).click();
  await page.getByLabel("Firm", { exact: true }).fill("Example Private Bank");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByLabel("Status at Example Private Bank")).toHaveValue("Researching");
  await page.getByLabel("Status at Example Private Bank").selectOption("Preparing");

  // Starting a plan from a practice client opens it, ready to work; then the resume bullets reflect it.
  await page.getByRole("tab", { name: "Practice clients" }).click();
  await page.getByRole("button", { name: /Chris Navarro/ }).click();
  await page.getByRole("button", { name: "Start a plan for Chris" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Chris Navarro" })).toBeVisible();
  await go(page, "/community/wealth/prep");
  await page.getByRole("tab", { name: "Resume bullets" }).click();
  await expect(page.getByText(/Built 1 goals-based wealth plan for peers/)).toBeVisible();
  await expect(page.getByText(/not a professional engagement/)).toBeVisible();
  await expect(page.getByText(/market journal \(1 entry\)/)).toBeVisible();
});

test("an anonymized case study needs a confirmation and clears the client's name", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth/clients");
  await page.getByRole("button", { name: "See an example client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Marcus Rivera" })).toBeVisible();
  await page.getByRole("navigation", { name: "Plan steps" }).getByRole("button", { name: /Presentation/ }).click();
  await expect(page.getByRole("heading", { name: "Case portfolio (anonymized)" })).toBeVisible();
  const button = page.getByRole("button", { name: "Download anonymized PowerPoint" });
  await expect(button).toBeDisabled();
  await expect(page.getByText(/replaced with "Client A" in \d+ place/)).toBeVisible();
  await page.getByLabel("Describe them without identifying details").fill("College junior with tip income");
  await page.getByRole("checkbox", { name: /I have checked that nothing in this case identifies the client/ }).check();
  await expect(button).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  expect(download.suggestedFilename()).toBe("Client-A-Case-Study.pptx");
});

test("the track community: share an anonymized case, review a classmate's, and follow the learning path", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
  await page.getByRole("link", { name: /Case library and reviews/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Learn, share, and review" })).toBeVisible();
  await expect(page.getByText("0 of 9 steps done")).toBeVisible();

  // The library has a classmate's case; reviewing needs all six lines scored.
  await page.getByRole("tab", { name: "Case library" }).click();
  await expect(page.getByRole("heading", { name: "College junior, tip income, first investment account" })).toBeVisible();
  await page.getByRole("button", { name: /^Review College junior/ }).click();
  const send = page.getByRole("button", { name: "Send my review" });
  await expect(send).toBeDisabled();
  for (const line of ["Discovery quality", "Goal clarity", "Analytical rigor", "Assumption transparency", "Recommendation and communication", "Disclosure and suitability"]) {
    await page.getByRole("group", { name: line }).getByText("3", { exact: true }).click();
  }
  await page.getByLabel("What worked well").fill("The goals have amounts and dates.");
  await page.getByLabel("What I would change").fill("Show where the return assumption comes from.");
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByText(/Review saved/)).toBeVisible();
  await page.getByRole("tab", { name: "Reviews" }).click();
  await expect(page.getByText(/College junior, tip income, first investment account/).first()).toBeVisible();
  await expect(page.getByText(/scored 3\.0 of 4/)).toBeVisible();

  // Share one of your own: it needs the same confirmation, and then it is in the library, with no review box on your own case.
  await go(page, "/community/wealth/clients");
  await page.getByRole("button", { name: "See an example client" }).click();
  await page.getByRole("navigation", { name: "Plan steps" }).getByRole("button", { name: /Presentation/ }).click();
  const share = page.getByRole("button", { name: "Share to the case library" });
  await expect(share).toBeDisabled();
  await page.getByLabel("Case title").fill("Server with variable tips");
  await page.getByRole("checkbox", { name: /I have checked that nothing in this case identifies the client/ }).check();
  await share.click();
  await expect(page.getByText(/Shared\. It is in the case library/)).toBeVisible();
  await go(page, "/community/wealth/cases");
  await page.getByRole("tab", { name: "Case library" }).click();
  await expect(page.getByRole("heading", { name: "Server with variable tips" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Review Server with variable tips/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Remove Server with variable tips/ })).toBeVisible();

  // Copying a case into your clients opens it as a plan of your own.
  await page.getByRole("button", { name: /^Copy College junior, tip income, first investment account into my clients/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Client A" })).toBeVisible();

  // The path now shows the shared case and the review as progress.
  await go(page, "/community/wealth/cases");
  await expect(page.getByText("1 of 1 case shared")).toBeVisible();
  await expect(page.getByText("1 of 2 reviews written")).toBeVisible();
});

test("a plan is tailored to the client, and the planning tools show their working", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth/clients");
  await page.getByRole("button", { name: "See an example client" }).click();
  const nav = page.getByRole("navigation", { name: "Plan steps" });
  await expect(nav.getByRole("button", { name: /Portfolio/ })).toBeVisible();
  await expect(nav.getByRole("button", { name: /Planning depth/ })).toBeVisible();

  // Choosing a kind of client switches parts off; a part can be switched back on by hand.
  await page.getByRole("button", { name: "College student", exact: true }).click();
  await expect(nav.getByRole("button", { name: /Portfolio/ })).toHaveCount(0);
  await page.getByRole("checkbox", { name: /Portfolio and investments/ }).check();
  await expect(nav.getByRole("button", { name: /Portfolio/ })).toBeVisible();
  await page.getByRole("button", { name: "General", exact: true }).click();

  // Roth conversion: the room in each bracket, the tax, and the working.
  await nav.getByRole("button", { name: /Planning depth/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Planning depth" })).toBeVisible();
  await page.getByRole("tab", { name: "Roth conversion" }).click();
  await page.getByLabel(/Taxable income before converting/).fill("40000");
  await page.getByLabel("Amount to convert this year").fill("20000");
  await expect(page.getByRole("cell", { name: "12%" }).first()).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /Converting/ })).toBeVisible();
  await page.getByText("How this was calculated", { exact: true }).click();
  await expect(page.getByText(/Federal tax on the conversion = tax on \$60,000 less tax on \$40,000/)).toBeVisible();

  // Capital gains: add a lot and see the net gain.
  await page.getByRole("tab", { name: "Capital gains" }).click();
  await page.getByRole("button", { name: "Add a lot" }).click();
  await page.getByLabel("Holding 1 cost").fill("10000");
  await page.getByLabel("Holding 1 value now").fill("25000");
  await expect(page.getByText("$15,000").first()).toBeVisible();

  // Giving: stock is cheaper than cash for the same gift.
  await page.getByRole("tab", { name: "Giving" }).click();
  await expect(page.getByText("Lowest cost")).toBeVisible();

  // The deck outline now includes the tools that have numbers.
  await nav.getByRole("button", { name: /Presentation/ }).click();
  await expect(page.getByText("Roth conversion").first()).toBeVisible();
});

test("scenarios, sensitivity, the house view, and the deck's customization", async ({ page }) => {
  test.setTimeout(150_000);
  await signInDemo(page);
  await go(page, "/community/wealth/clients");
  await page.getByRole("button", { name: "See an example client" }).click();
  const nav = page.getByRole("navigation", { name: "Plan steps" });

  // Scenarios: the usual three, run side by side.
  await nav.getByRole("button", { name: /Model/ }).click();
  await page.getByRole("tab", { name: /Scenarios/ }).click();
  await page.getByRole("button", { name: "Create base, upside and downside" }).click();
  await expect(page.getByText("Upside").first()).toBeVisible();
  await expect(page.getByText(/median after 35 years/).first()).toBeVisible();
  await page.getByLabel("Downside Expected return").fill("3");
  await expect(page.getByText(/Expected return \$?3%/).first()).toBeVisible();

  // Sensitivity: a tornado of what matters most.
  await page.getByRole("tab", { name: /Sensitivity/ }).click();
  await expect(page.getByRole("img", { name: /Tornado chart/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Expected return" })).toBeVisible();

  // House view: write it once, apply it to the plan.
  await go(page, "/community/wealth/house");
  await expect(page.getByRole("heading", { level: 1, name: "House view" })).toBeVisible();
  await page.getByLabel(/^Inflation/).first().fill("3.1");
  await page.getByLabel("Growth expected return").fill("8.2");
  await page.getByLabel("Headline").fill("Rates are the story this quarter");
  await page.getByLabel("10-year Treasury yield latest value").fill("4.1%");
  await page.getByLabel("10-year Treasury yield source").fill("U.S. Treasury");
  await expect(page.getByText(/Saved|Saving/).first()).toBeVisible();

  await go(page, "/community/wealth/clients");
  await page.getByRole("button", { name: "Open", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Marcus Rivera" })).toBeVisible();
  await page.getByRole("button", { name: "Apply my house view assumptions" }).click();
  await expect(page.getByText(/Applied: inflation, return and volatility/)).toBeVisible();

  // Presentation: look, process, market snapshot, anticipated questions, role and handout.
  await nav.getByRole("button", { name: /Presentation/ }).click();
  await expect(page.getByRole("group", { name: "Style template" }).getByRole("button")).toHaveCount(6);
  await expect(page.getByRole("group", { name: "Style template" }).getByRole("button", { name: /Daily Bread/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Private Bank/ }).click();
  await expect(page.getByRole("button", { name: /Private Bank/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Heritage green/ }).click();
  await expect(page.getByRole("button", { name: /Heritage green/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Your role, as it appears on the title slide").fill("Wealth advisor");
  await expect(page.getByRole("alert").filter({ hasText: /suggests a license/ })).toBeVisible();
  await page.getByLabel("Your role, as it appears on the title slide").fill("Student, Daily Bread Wealth Management Track");
  await page.getByRole("button", { name: "Copy market view from my house view" }).click();
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue("Rates are the story this quarter");
  await page.getByLabel("Step 1 title").fill("Listen");
  await page.getByLabel("Part of the deck").selectOption("model");
  await expect(page.getByLabel(/Question: What if the market falls right at the start/)).toBeVisible();
  await page.getByRole("button", { name: "Add my own question" }).click();
  await page.getByLabel("Your question", { exact: true }).fill("What about crypto?");
  await expect(page.getByText(/Market snapshot/).first()).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PowerPoint (.pptx)" }).click()]);
  expect(download.suggestedFilename()).toBe("Marcus-Rivera-Wealth-Plan.pptx");

  await page.getByRole("button", { name: "Show the client handout" }).click();
  await page.getByLabel("Market snapshot", { exact: true }).last().check();
  await expect(page.locator("#wealth-brief")).toContainText("Rates are the story this quarter");
  await expect(page.locator("#wealth-brief")).toContainText("not a registered investment adviser");
});

test("follow-up: stages and action items, the email draft, the compliance record, and saved versions", async ({ page }) => {
  test.setTimeout(150_000);
  await signInDemo(page);
  await go(page, "/community/wealth/clients");
  await page.getByRole("button", { name: "See an example client" }).click();
  const nav = page.getByRole("navigation", { name: "Plan steps" });
  await nav.getByRole("button", { name: /Follow-up/ }).click();

  // Stage and action items.
  await page.getByRole("combobox", { name: "Stage" }).selectOption("analysis");
  await page.getByLabel("Next meeting").fill("2026-11-14");
  await page.getByRole("button", { name: "Add an item" }).click();
  await page.getByLabel("Item 1 description").fill("Send your last three pay stubs");
  await page.getByLabel("Item 1 due date").fill("2026-09-01");
  await expect(page.getByText(/Overdue since September 1, 2026/)).toBeVisible();

  // The email draft carries the item, the next meeting and the educational reminder.
  await page.getByRole("tab", { name: /Follow-up email/ }).click();
  const body = page.getByLabel("Message");
  await expect(body).toHaveValue(/Send your last three pay stubs/);
  await expect(body).toHaveValue(/November 14, 2026/);
  await expect(body).toHaveValue(/I am a student, not a licensed adviser/);
  await page.getByRole("combobox", { name: /Tone/ }).selectOption("formal");
  await expect(body).toHaveValue(/^Dear Marcus Rivera,/);

  // Compliance: the review catches a title, the checklist keeps dates.
  await page.getByRole("tab", { name: /Compliance/ }).click();
  await expect(page.getByText("The disclosures slide is in the deck.")).toBeVisible();
  await page.getByRole("checkbox", { name: /I told the client this is an educational exercise/ }).check();
  await expect(page.getByText(/Confirmed /).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /Compliance\s*\(1\/13\)/ })).toBeVisible();

  // Versions: save, change the plan, see the change, restore.
  await page.getByRole("tab", { name: /Versions/ }).click();
  await page.getByLabel("Name", { exact: true }).fill("After meeting 1");
  await page.getByRole("button", { name: "Save a version" }).click();
  await expect(page.getByText("Version saved.")).toBeVisible();
  await nav.getByRole("button", { name: /Model/ }).click();
  await page.getByLabel(/^Monthly contribution/).fill("900");
  await nav.getByRole("button", { name: /Follow-up/ }).click();
  await page.getByRole("tab", { name: /Versions/ }).click();
  await page.getByRole("button", { name: /What changed since After meeting 1/ }).click();
  await expect(page.getByText(/Monthly saving: \$400 to \$900/)).toBeVisible();
  await page.getByRole("button", { name: /Restore After meeting 1/ }).click();
  await expect(page.getByText(/Restored "After meeting 1"/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Saved versions \(2\)/ })).toBeVisible();

  // The client list shows the stage, the next meeting, and the pipeline.
  await go(page, "/community/wealth/clients");
  await expect(page.getByRole("heading", { name: "Pipeline" })).toBeVisible();
  await expect(page.getByText("Next meeting November 14, 2026")).toBeVisible();
  await expect(page.getByText(/1 open item, 1 overdue/)).toBeVisible();
});

test("practice partners and admin-entered recruiting dates (and the career portfolio, when it is switched on)", async ({ page }) => {
  test.setTimeout(150_000);
  await signInDemo(page);
  await go(page, "/community/ib");

  // Recruiting dates an admin entered show in the tracker, with how old each check is, and can be added to it.
  await page.getByRole("tab", { name: "Recruiting", exact: true }).click();
  await expect(page.getByText("Example Bank").first()).toBeVisible();
  await expect(page.getByText(/Checked .* \(\d+ days? ago|today\)/).first()).toBeVisible();
  await page.getByRole("button", { name: "Add Example Bank to my tracker" }).click();
  await expect(page.getByRole("button", { name: "Add Example Bank to my tracker" })).toHaveText("In my tracker");
  await expect(page.getByLabel("Firm 1", { exact: true })).toHaveValue("Example Bank");

  // The practice board: offer to practice with someone, then post your own request.
  await page.getByRole("tab", { name: "Practice partners" }).click();
  await expect(page.getByText("Walk through an LBO out loud")).toBeVisible();
  await page.getByRole("button", { name: /Offer to practice: Walk through an LBO out loud/ }).click();
  await expect(page.getByText("Contact:").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Withdraw my offer for Walk through an LBO/ })).toBeVisible();
  await page.getByLabel("When works for you").fill("Friday afternoons");
  await page.getByRole("button", { name: "Post my request" }).click();
  await expect(page.getByRole("button", { name: /Close my request: Technical questions/ })).toBeVisible();
  await page.getByRole("button", { name: /Close my request: Technical questions/ }).click();
  await expect(page.getByRole("button", { name: /Close my request: Technical questions/ })).toHaveCount(0);

  // The career portfolio is set aside for now (see src/lib/features.ts); its checks run again when it is switched back on.
  if (FEATURES.careerPortfolio) {
    // The career portfolio is gated by a checklist, and a title that implies a license is refused.
    await go(page, "/community");
    await page.getByRole("link", { name: "Career portfolio" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Career portfolio" })).toBeVisible();
    const print = page.getByRole("button", { name: "Print or save as PDF" });
    await expect(print).toBeDisabled();
    await page.getByLabel("Your name").fill("Alex Student");
    await page.getByLabel("Your role line").fill("Wealth advisor");
    await expect(page.getByRole("alert").filter({ hasText: /suggests a license/ })).toBeVisible();
    await page.getByLabel("Your role line").fill("Student, University of Florida");
    for (const box of await page.getByRole("checkbox").all()) await box.check();
    await expect(print).toBeEnabled();
    await expect(page.locator("#career-portfolio")).toContainText("Alex Student");
    await expect(page.locator("#career-portfolio")).toContainText("not real transactions or client work");
  }
});

test("wealth models: a backtest over real history, withdrawal rules, an estate snapshot, and their Excel exports", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
  await page.getByRole("link", { name: /Use the tools/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Wealth models" })).toBeVisible();

  // All stocks through 2008 alone: the published S&P 500 return for that year.
  await page.getByRole("button", { name: "All stocks" }).click();
  await page.getByLabel("From the start of").selectOption("2008");
  await page.getByLabel("To the end of").selectOption("2008");
  await expect(page.getByText("-36.5%").first()).toBeVisible();
  await page.getByLabel(/^U\.S\. large stocks/).fill("70");
  await expect(page.getByRole("alert")).toContainText("add to 70%");
  await page.getByRole("button", { name: "60 / 40" }).click();
  await page.getByLabel("From the start of").selectOption("1976");
  await page.getByLabel("To the end of").selectOption("2025");
  await expect(page.getByRole("img", { name: /Growth of one dollar from 1976 to 2025/ })).toBeVisible();
  const backtest = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export the backtest to Excel" }).click();
  expect((await backtest).suggestedFilename()).toBe("Portfolio-backtest.xlsx");

  // Withdrawal rules: fixed percent never runs out; spending a lot fails in the hard decades.
  await page.getByRole("tab", { name: "Withdrawal strategies" }).click();
  await page.getByLabel(/^Spending in the first year/).fill("80000");
  await expect(page.getByText("8.0% of the balance")).toBeVisible();
  const table = page.getByRole("table", { name: /Withdrawal strategies compared/ });
  await expect(table.getByRole("row", { name: /Money lasted the whole period/ })).toContainText("100.0%");
  await page.getByText("How this was calculated", { exact: true }).click();
  await expect(page.getByText(/it ran out for retirements starting in/)).toBeVisible();

  // Estate snapshot: titling decides the route, and a large estate shows tax above the exemption.
  await page.getByRole("tab", { name: "Estate snapshot" }).click();
  await page.getByRole("button", { name: "Add an asset" }).click();
  await page.getByLabel("Asset 1 name").fill("Business");
  await page.getByLabel("Business value").fill("20000000");
  await expect(page.getByText("on $5,000,000 above the exemption")).toBeVisible();
  await page.getByLabel(/^Married/).check();
  await expect(page.getByText("below the exemption", { exact: true })).toBeVisible();
  await page.getByLabel("Business titling").selectOption("trust");
  await expect(page.getByRole("table", { name: "How the estate passes, by titling" })).toContainText("By the trust's terms");

  // The software guide names what UF offers.
  await page.getByRole("tab", { name: "Industry software" }).click();
  await expect(page.getByRole("heading", { name: "eMoney Advisor" })).toBeVisible();
});

test("a practice case opens as a client plan, and its financial statements export to Excel", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth/cases");
  await page.getByRole("tab", { name: "Practice cases" }).click();
  await page.getByRole("button", { name: "Read the brief: Five years to retirement" }).click();
  await expect(page.getByText(/Tom's pension can be \$2,400 a month/)).toBeVisible();
  await page.getByRole("button", { name: "Start this case: Five years to retirement" }).click();
  await expect(page).toHaveURL(/\/community\/wealth\/.+/);
  await expect(page.getByRole("heading", { level: 1, name: "Tom and Linda Bauer" })).toBeVisible();
  await expect(page.getByLabel("Discovery meeting notes")).toHaveValue(/^Practice case\./);
  await page.getByRole("navigation", { name: "Plan steps" }).getByRole("button", { name: /Snapshot/ }).click();
  await expect(page.getByText("$1,850,000 owned, $0 owed")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export financial statements to Excel" }).click();
  expect((await download).suggestedFilename()).toBe("Tom-and-Linda-Bauer-financial-statements.xlsx");
});

test("consulting: an issue tree, an exhibit drill, a storyline that becomes three slides, and Excel exports", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/consulting");

  // Issue tree: start from a template, grow it, mark a hypothesis, and see what to look at again.
  await page.getByRole("tab", { name: "Issue tree", exact: true }).click();
  await page.getByRole("button", { name: "New issue tree" }).click();
  await expect(page.getByLabel("Branch 1", { exact: true })).toHaveValue("Revenue has fallen");
  await expect(page.getByText(/A tree without a hypothesis is a list/)).toBeVisible();
  await page.getByRole("button", { name: "Test first: Units sold are lower" }).click();
  await expect(page.getByText(/Now test it aloud/)).toBeVisible();
  await page.getByRole("button", { name: "Add a sub-branch under Fixed costs are higher" }).click();
  await page.getByLabel("Branch 2.2.1", { exact: true }).fill("Rent went up");
  await expect(page.getByText(/"Fixed costs are higher" has only one sub-branch/)).toBeVisible();
  await page.getByRole("button", { name: "Remove Rent went up" }).click();
  await expect(page.getByLabel("Branch 2.2.1", { exact: true })).toHaveCount(0);

  // Exhibit drill: two numbers and the takeaway, marked against the exhibit's own data.
  await page.getByRole("tab", { name: "Exhibit drills", exact: true }).click();
  await expect(page.getByRole("img", { name: /Revenue by customer segment/ })).toBeVisible();
  await page.getByLabel(/^By what percent did total revenue grow/).fill("20");
  await page.getByLabel(/^What share of the growth in dollars/).fill("75");
  await page.getByRole("radio", { name: /Three quarters of the growth came from Small business/ }).check();
  await page.getByRole("button", { name: "Check my reading" }).click();
  await expect(page.getByText(/^3 of 3 in \d+:\d\d\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Next exhibit" }).click();
  await expect(page.getByRole("table", { name: /Average price and units sold/ })).toBeVisible();

  // Storyline: empty coaching, then the example, then the three slides.
  await page.getByRole("tab", { name: "Storyline", exact: true }).click();
  await page.getByRole("button", { name: "New storyline" }).click();
  await expect(page.getByText(/Write the answer first/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Download the three slides/ })).toBeDisabled();
  await page.getByRole("button", { name: "See an example" }).click();
  await expect(page.getByText(/Read only the three titles aloud/)).toBeVisible();
  const slides = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download the three slides/ }).click();
  expect((await slides).suggestedFilename()).toBe("Example-the-regional-gym-chain.pptx");

  // The profit model and a market-sizing chain export to Excel.
  await page.getByRole("tab", { name: "Profit and break-even" }).click();
  const profit = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export the profit model to Excel" }).click();
  expect((await profit).suggestedFilename()).toBe("Profit-and-break-even.xlsx");
  await page.getByRole("tab", { name: "Market sizing" }).click();
  await page.getByRole("button", { name: /Start from: Cups of coffee/ }).click();
  const sizing = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export to Excel" }).click();
  expect((await sizing).suggestedFilename()).toBe("Cups-of-coffee-sold-in-a-year-in-a-country.xlsx");

  await page.getByRole("tab", { name: "Industry software", exact: true }).click();
  await expect(page.getByRole("heading", { name: "think-cell" })).toBeVisible();
});

test("peer review: share a model, and review a classmate's on four lines", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/ib");
  await page.getByRole("tab", { name: "Peer review", exact: true }).click();

  // A classmate's DCF, with its headline numbers recalculated from what they shared.
  const theirs = page.getByRole("listitem").filter({ hasText: "DCF of a regional retailer" });
  await expect(theirs.getByText("Is my terminal growth too high for a mature retailer?")).toBeVisible();
  await expect(theirs.getByText("8.5% and 4%")).toBeVisible();
  await theirs.getByRole("button", { name: "Review DCF of a regional retailer" }).click();
  await expect(theirs.getByRole("button", { name: "Send my review" })).toBeDisabled();
  for (const line of ["Structure", "Assumptions", "Accuracy", "Communication"]) await theirs.getByRole("group", { name: line }).getByRole("radio").nth(2).check();
  await theirs.getByLabel("What works").fill("Clear layout and both terminal value methods shown.");
  await theirs.getByLabel(/^What I would look at again/).fill("A 4% perpetual growth rate is above long-run nominal growth.");
  await theirs.getByRole("button", { name: "Send my review" }).click();
  await expect(theirs.getByText(/1 review/)).toBeVisible();
  await expect(theirs.getByRole("button", { name: "Edit my review" })).toBeVisible();

  // Share my own LBO; it appears under my models and can be withdrawn.
  await page.getByLabel("Which model").selectOption("lbo");
  await page.getByLabel("Title", { exact: true }).fill("First LBO");
  await page.getByRole("button", { name: "Share for review" }).click();
  await expect(page.getByText("Shared. Others in this tool set can now review it.")).toBeVisible();
  const mine = page.getByRole("listitem").filter({ hasText: "First LBO" });
  await expect(mine.getByText(/0 reviews/)).toBeVisible();
  await mine.getByRole("button", { name: "Stop sharing First LBO" }).click();
  await expect(page.getByText("You have not shared a model yet.")).toBeVisible();
  // Comparables with no companies cannot be shared.
  await page.getByLabel("Which model").selectOption("comps");
  await expect(page.getByText(/nothing in that model to share yet/)).toBeVisible();

  // Consulting has its own list: a storyline, shown by its slide titles.
  await go(page, "/community/consulting");
  await page.getByRole("tab", { name: "Peer review", exact: true }).click();
  await expect(page.getByText(/^Slide 1: FitCo should defend its 15 strongest gyms/)).toBeVisible();
});

test("banking: a practice case loads its numbers, with sources, sensitivity in Excel, and the Capital IQ walkthrough", async ({ page }) => {
  test.setTimeout(120_000);
  page.on("dialog", (d) => void d.accept());
  await signInDemo(page);
  await go(page, "/community/ib");
  await page.getByRole("tab", { name: "Practice cases", exact: true }).click();
  await page.getByRole("button", { name: "Read the brief: Selling a family company" }).click();
  await expect(page.getByText(/Juniper Snacks is a family-owned maker of baked snacks/)).toBeVisible();
  await page.getByRole("button", { name: "Load the numbers: Selling a family company" }).click();

  // The valuation models open with the case in them, and the football field shows all four methods.
  await expect(page.getByRole("img", { name: /Football field: .*Trading comparables.*Precedent transactions/ })).toBeVisible();
  await page.getByRole("tab", { name: "Comparables", exact: true }).click();
  await expect(page.getByLabel("Company 1 name")).toHaveValue("Harvest Table Foods");
  await expect(page.getByLabel("Harvest Table Foods source")).toHaveValue("Practice case (invented)");
  await expect(page.getByText("Every one of the 5 companies names its source.")).toBeVisible();
  await page.getByLabel("Harvest Table Foods source").fill("");
  await expect(page.getByText(/4 of 5 companies name a source/)).toBeVisible();
  await page.getByRole("tab", { name: "WACC", exact: true }).click();
  await expect(page.getByText("8.09%").first()).toBeVisible();

  // The buyout case replaces only the LBO.
  await page.getByRole("tab", { name: "Practice cases", exact: true }).click();
  await page.getByRole("button", { name: "Load the numbers: Should the fund bid?" }).click();
  await page.getByRole("tab", { name: "LBO", exact: true }).click();
  await expect(page.getByText("12.6%").first()).toBeVisible();
  await page.getByRole("tab", { name: "Comparables", exact: true }).click();
  await expect(page.getByLabel("Company 1 name")).toHaveValue("Harvest Table Foods");

  // The Capital IQ walkthrough, and what UF offers.
  await page.getByRole("tab", { name: "Industry software", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Capital IQ walkthrough" })).toBeVisible();
  await expect(page.getByText(/find Peer Analysis, then Quick Comps/)).toBeVisible();
  await expect(page.getByText(/Library West \(3rd floor, all UF students\)/)).toBeVisible();
});

test("consulting: a full case hands over exhibits and starts a storyline; wealth models can be reviewed", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/consulting");
  await page.getByRole("tab", { name: "Mock case", exact: true }).click();
  await expect(page.getByText("Full case, with exhibits")).toHaveCount(2);
  await page.getByRole("button", { name: /Start the case: Summit Outfitters/ }).click();
  await page.getByRole("button", { name: /Ask: Whether all mall stores perform alike/ }).click();
  await expect(page.getByText(/15 of the 40 mall stores lose about/)).toBeVisible();
  for (let k = 0; k < 2; k++) {
    await page.getByRole("button", { name: "Check my answer" }).click();
    await page.getByRole("button", { name: "Next step" }).click();
  }
  await expect(page.getByRole("img", { name: /Store-level profit by format/ })).toBeVisible();
  await page.getByLabel("Your numeric answer").fill("24.7");
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByText(/^Correct\. Answer: 24\.7/)).toBeVisible();
  for (let k = 0; k < 3; k++) {
    await page.getByRole("button", { name: "Next step" }).click();
    await page.getByRole("button", { name: "Check my answer" }).click();
  }
  await page.getByRole("button", { name: "Finish the case" }).click();
  await page.getByRole("button", { name: "Start a storyline from this case" }).click();
  await expect(page.getByRole("button", { name: "Added: open the Storyline tab" })).toBeDisabled();
  await page.getByRole("tab", { name: "Storyline", exact: true }).click();
  await expect(page.getByLabel(/^Question: what the client is asking/)).toHaveValue("Should Summit close its mall stores?");

  await go(page, "/community/wealth/models");
  await page.getByRole("tab", { name: "Peer review", exact: true }).click();
  const theirs = page.getByRole("listitem").filter({ hasText: "60/40 since 1976" });
  await expect(theirs.getByText("Mix: 60% stocks, 40% bonds")).toBeVisible();
  await page.getByLabel("Which model").selectOption("estate");
  await expect(page.getByText(/nothing in that model to share yet/)).toBeVisible();
});
