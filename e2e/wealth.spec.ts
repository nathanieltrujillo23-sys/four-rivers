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

test("an approved person fills in a plan and the toolkit in their own private space", async ({ page }) => {
  test.setTimeout(90_000);
  await signInDemo(page);
  await go(page, "/community");
  await expect(page.getByRole("link", { name: "Open wealth tools" })).toBeVisible();
  await expect(page.getByText("Tools group · private to you")).toBeVisible();
  await page.getByRole("link", { name: "Open wealth tools" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Wealth Tools" })).toBeVisible();
  await expect(page.getByText("Only you can see this space.")).toBeVisible();

  // The plan: an example fills every module, and the numbers carry through to the model and the brief.
  await page.getByRole("button", { name: "See an example plan" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Marcus Rivera");
  await page.getByRole("navigation", { name: "Plan modules" }).getByRole("button", { name: /Goals/ }).click();
  await expect(page.getByText("Total needed")).toBeVisible();
  await expect(page.getByLabel("Name of Emergency fund (3 months)")).toBeVisible();
  await page.getByRole("navigation", { name: "Plan modules" }).getByRole("button", { name: /Execution/ }).click();
  await expect(page.getByText("Chance of success")).toBeVisible();
  await expect(page.getByRole("img", { name: /Projected balance over 35 years/ })).toBeVisible();
  await page.getByRole("tab", { name: /Roadmap/ }).click();
  await expect(page.getByText(/avalanche payoff/i).first()).toBeVisible();
  await page.getByRole("button", { name: "One page brief", exact: true }).click();
  await expect(page.locator("#wealth-brief")).toContainText("Marcus Rivera");
  await expect(page.locator("#wealth-brief")).toContainText("Money mission");

  // The toolkit: summarized, nothing counted until a person puts their own numbers in a tool.
  await page.getByRole("tab", { name: "Money toolkit" }).click();
  await expect(page.getByText("Nothing yet. Your numbers show up here")).toBeVisible();
  await page.getByRole("button", { name: /^Give/ }).click();
  await page.getByRole("button", { name: /^Giving plan/ }).click();
  await expect(page.getByText("Nothing yet. Your numbers show up here")).toBeVisible(); // opening alone fills nothing in
  const percent = page.getByLabel("Percent to give");
  await percent.fill("12");
  await expect(page.getByRole("heading", { name: /Your numbers at a glance \(1 tool\)/ })).toBeVisible();
  await expect(page.locator("#wealth-toolkit-summary")).toContainText("Giving plan");
  await expect(page.getByRole("button", { name: /^Give.*1 of 6/ })).toBeVisible();

  // Clearing a tool takes it back out of the summary.
  await page.getByRole("button", { name: "Clear my numbers" }).click();
  await expect(page.getByText("Nothing yet. Your numbers show up here")).toBeVisible();
});
