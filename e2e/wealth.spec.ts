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

test("the portfolio step builds from assumptions the analyst enters, with guidelines, and the retirement income phase runs", async ({ page }) => {
  test.setTimeout(120_000);
  await signInDemo(page);
  await go(page, "/community/wealth");
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
  await go(page, "/community/wealth");
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
  await page.getByRole("link", { name: /Case library and learning path/ }).click();
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
  await go(page, "/community/wealth");
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
