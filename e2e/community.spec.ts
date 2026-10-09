import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { acceptDialogs, go, signInDemo } from "./helpers.js";

const GROUP = "/community/demo-group-1";

test.beforeEach(async ({ page }) => {
  acceptDialogs(page);
  await signInDemo(page);
});

test("a group shows its code, chat, and prayer wall", async ({ page }) => {
  await go(page, GROUP);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tuesday Night Stewards");
  await expect(page.getByText("4271")).toBeVisible();

  await page.getByPlaceholder("Write a message…").fill("Hello from the test");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Hello from the test")).toBeVisible();

  await page.getByPlaceholder("What can we pray for?").fill("Wisdom for the week");
  await page.getByRole("button", { name: "Add to the wall" }).click();
  await expect(page.getByText("Wisdom for the week")).toBeVisible();
});

test("joining with a wrong code explains what went wrong", async ({ page }) => {
  await go(page, "/community");
  await page.getByRole("textbox").first().fill("0000");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByText("No group has that code")).toBeVisible();
});

test("a leader sets a reading plan, ticks today, and catches up on a missed day", async ({ page }) => {
  await go(page, `${GROUP}/leader`);
  await page.getByPlaceholder(/^e\.g\. Luke/).fill("Luke");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  // Start four days ago so there are days to catch up on.
  const start = new Date();
  start.setDate(start.getDate() - 4);
  await page.locator('input[type="date"]').first().fill(start.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Apply to group calendar" }).click();
  await expect(page.getByText("Applied. Your group can see it now.")).toBeVisible();

  await go(page, GROUP);
  await expect(page.getByText("Today's reading")).toBeVisible();
  await page.getByRole("button", { name: "I finished today's reading" }).click();
  await expect(page.getByRole("button", { name: "I finished today's reading" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // The Catch up list names every earlier day I have not read; ticking one clears it from the list.
  const catchUp = page.getByRole("heading", { name: "Catch up" });
  await expect(catchUp).toBeVisible();
  const before = await page.getByRole("button", { name: /^I read / }).count();
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: /^I read / }).first().click();
  await expect(page.getByRole("button", { name: /^I read / })).toHaveCount(before - 1);

  // Catch-up: a missed day's box is a button on my own row.
  const missed = page.getByRole("button", { name: /^Mark .* as read$/ }).first();
  await missed.click();
  await expect(page.getByRole("button", { name: /^Mark .* as not read$/ }).first()).toBeVisible();
});

test("the leader can find any verse in the Bible by reference or keyword", async ({ page }) => {
  await go(page, `${GROUP}/leader`);
  await page.getByRole("button", { name: "KJV", exact: true }).click();
  const search = page.getByPlaceholder(/Reference or keyword/);
  await search.fill("John 3:16");
  await expect(page.getByRole("button", { name: /John 3:16 \(KJV\)/ })).toBeVisible();
  await search.fill("faithful steward");
  await expect(page.getByRole("button", { name: /Luke 12:42/ })).toBeVisible();
});

test("group settings: rename, new code, pause joining, archive and restore", async ({ page }) => {
  await go(page, `${GROUP}/leader`);
  await page.getByLabel("Group name").fill("Renamed group");
  await page.getByRole("button", { name: "Rename" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("button", { name: "Make a new code" }).click();
  await expect(page.getByText(/Your new code is \d{4}/)).toBeVisible();

  const accepting = page.getByLabel(/Accept new members/);
  await accepting.click();
  await expect(accepting).not.toBeChecked();

  await page.getByRole("button", { name: "Archive group" }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.getByRole("heading", { name: "Archived groups" })).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Renamed group")).toBeVisible();
});

test("a co-leader can be named and unnamed by the leader", async ({ page }) => {
  await go(page, `${GROUP}/leader`);
  const maria = page.getByRole("listitem").filter({ hasText: "Maria" }).first();
  await maria.getByRole("button", { name: "Make co-leader" }).click();
  await expect(maria.getByText("Co-leader", { exact: true })).toBeVisible();
  await maria.getByRole("button", { name: "Remove co-leader" }).click();
  await expect(maria.getByRole("button", { name: "Make co-leader" })).toBeVisible();
});

test("the notification bell lists what happened in the group", async ({ page }) => {
  await go(page, GROUP);
  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(page.getByText("passed the final exam").first()).toBeVisible();
});

test("a leader starts from a ready-made plan and sees how members are doing", async ({ page }) => {
  await go(page, `${GROUP}/leader`);
  await expect(page.getByRole("heading", { name: "How everyone is doing" })).toBeVisible();
  await expect(page.getByText("Maria").first()).toBeVisible();
  await page.getByRole("button", { name: /Proverbs in 31 days/ }).click();
  await expect(page.getByPlaceholder(/^e\.g\. Luke/)).toBeVisible();
  await expect(page.getByText(/31 days/).first()).toBeVisible();
  await page.getByRole("button", { name: "Apply to group calendar" }).click();
  await expect(page.getByText("Applied. Your group can see it now.")).toBeVisible();
});

test("the reading plan can be added to a calendar", async ({ page }) => {
  await go(page, `${GROUP}/leader`);
  await page.getByPlaceholder(/^e\.g\. Luke/).fill("Luke");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Apply to group calendar" }).click();
  await expect(page.getByText("Applied. Your group can see it now.")).toBeVisible();
  await go(page, GROUP);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to my calendar" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.ics$/);
  const path = await file.path();
  const text = (await import("node:fs")).readFileSync(path!, "utf8");
  expect(text).toContain("BEGIN:VCALENDAR");
  expect(text).toContain("SUMMARY:Luke");
});

test("a leader invites people with a QR code and the group code, or a printed poster", async ({ page }) => {
  await go(page, `${GROUP}/leader`);
  // The code itself sits behind the button.
  await expect(page.getByText("4271")).toHaveCount(0);
  await page.getByRole("button", { name: "Invite to group" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img", { name: /QR code/ })).toBeVisible();
  await expect(dialog.getByText("4271")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Invite to group" }).click();

  await page.getByRole("link", { name: "Print an invite poster" }).click();
  await expect(page).toHaveURL(/\/poster$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tuesday Night Stewards");
  await expect(page.getByText("4271")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print the poster" })).toBeVisible();
});

const BREAD = "/community/demo-group-2";

test("a group with a permanent verse and code keeps them", async ({ page }) => {
  await go(page, BREAD);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Daily Bread");
  await expect(page.getByText("Our group verse")).toBeVisible();
  await expect(page.getByText(/For by grace are ye saved through faith/)).toBeVisible();
  await expect(page.getByText("Ephesians 2:8-10 (KJV)")).toBeVisible();

  await go(page, `${BREAD}/leader`);
  await expect(page.getByText("This group has a permanent verse")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save verse" })).toHaveCount(0);
  await expect(page.getByText("This group's code is permanent")).toBeVisible();
  await expect(page.getByRole("button", { name: "Make a new code" })).toHaveCount(0);
  await page.getByRole("button", { name: "Invite to group" }).click();
  await expect(page.getByRole("dialog").getByText("2810")).toBeVisible();
});

test("a discovery meeting: agreement, six steps with notes, topics, and tools", async ({ page }) => {
  await go(page, BREAD);
  // Ordinary groups do not have the workshop.
  await go(page, GROUP);
  await expect(page.getByRole("heading", { name: "Discovery workshop" })).toHaveCount(0);
  await go(page, BREAD);

  const workshop = page.getByRole("heading", { name: "Discovery workshop" });
  await expect(workshop).toBeVisible();
  // It sits below the chat and the member list.
  const chat = await page.getByPlaceholder("Write a message…").boundingBox();
  const ws = await workshop.boundingBox();
  expect(ws!.y).toBeGreaterThan(chat!.y);

  await page.getByLabel("Who are you meeting with?").fill("Alex Rivera");
  await page.getByRole("button", { name: "Start a discovery meeting" }).click();
  await expect(page.getByRole("heading", { name: "Alex Rivera" })).toBeVisible();

  // The agreement needs both names, both signatures, and the checkbox.
  const sign = page.getByRole("button", { name: "Sign the agreement" });
  await expect(sign).toBeDisabled();
  await page.getByLabel("Analyst's printed name").fill("Sam Analyst");
  const typed = page.getByLabel("I'd rather use my typed name as my signature");
  await typed.first().check();
  await typed.last().check();
  await page.getByLabel(/We have read the agreement/).check();
  await sign.click();
  await expect(page.getByText(/Agreement signed on/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the agreement" })).toHaveAttribute("href", /drive\.google\.com/);

  // Step 1, then onward through all six.
  await expect(page.getByRole("heading", { name: "Step 1: Basics / Connection" })).toBeVisible();
  await page.getByLabel("Notes").fill("Junior in finance, a little stressed about loans.");
  await page.getByRole("button", { name: "Next: Vision" }).click();
  await expect(page.getByText("If they wrote the storybook version")).toBeVisible();
  await page.getByRole("button", { name: "Next: SWOT Analysis" }).click();
  await expect(page.getByRole("heading", { name: "Step 3: SWOT Analysis" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Strengths" }).getByLabel("Financially")).toBeVisible();
  await page.getByRole("group", { name: "Threats" }).getByLabel("Personally").fill("Burnout");
  await page.getByRole("button", { name: "Next: SWOT Reflection" }).click();
  await page.getByRole("button", { name: "Next: Money Mission Statement" }).click();
  await expect(page.getByText("Ephesians 2:8-10 (KJV)").last()).toBeVisible();
  await page.getByLabel("Their money mission statement, in their words").fill("Use money to open doors for others.");
  await page.getByRole("button", { name: "Next: Recap / Next Steps" }).click();
  await expect(page.getByRole("heading", { name: "Step 6: Recap / Next Steps" })).toBeVisible();

  // Topics, and a tool for one of them.
  await page.getByRole("button", { name: "Buying a car", exact: true }).click();
  await page.getByRole("button", { name: "Paying off debt", exact: true }).click();
  await expect(page.getByText("· 2 chosen")).toBeVisible();
  await expect(page.getByText("Chosen topic")).toHaveCount(2);
  await page.getByRole("button", { name: /^Buying a car (Chosen topic )?The loan/ }).first().click();
  await expect(page.getByText("True monthly cost of the car")).toBeVisible();
  const cost = page.getByText("True monthly cost of the car").locator("xpath=following-sibling::p[1]");
  const before = await cost.textContent();
  await page.getByLabel(/^Price/).fill("30000");
  await expect(cost).not.toHaveText(before!);

  // The busiest screen is still accessible.
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' // ')}`)).toEqual([]);

  // The notes were saved: leave and come back.
  await page.getByRole("button", { name: "Back to meetings" }).click();
  await expect(page.getByText("Agreement signed · Step 6 of 6")).toBeVisible();
  await page.getByRole("button", { name: /Alex Rivera/ }).click();
  await page.getByRole("button", { name: /^1\s*Basics/ }).click();
  await expect(page.getByLabel("Notes")).toHaveValue("Junior in finance, a little stressed about loans.");
});

test("the money toolkit works for any member of a workshop group", async ({ page }) => {
  await go(page, BREAD);
  const toolkit = page.getByRole("heading", { name: "Money toolkit" });
  await expect(toolkit).toBeVisible();
  const open = async (name: RegExp, expected: string) => {
    await page.getByRole("button", { name }).first().click();
    await expect(page.getByText(expected).first()).toBeVisible();
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations.map((v) => `${name}: ${v.id}: ${v.nodes.map((n) => n.html.slice(0, 100)).join(" // ")}`)).toEqual([]);
  };
  await open(/^Buying a house/, "Cash needed up front");
  await open(/^Taking a vacation/, "To be ready in 8 months");
  await open(/^Paying off debt/, "Avalanche: highest interest first");
  await open(/^Getting married/, "Combined income");
  await open(/^Investing in the markets/, "Regular brokerage account");
  await open(/^Investing in yourself/, "Pays itself back in");
  await open(/^Income/, "Compare two job offers");
  await open(/^Budgeting/, "Budget");
});
