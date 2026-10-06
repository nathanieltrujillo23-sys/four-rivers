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
