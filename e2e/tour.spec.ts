import { expect, test } from "@playwright/test";

test("the guided tour visits every step and finds what it points at", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Show me around" }).click();
  const dialog = page.getByRole("dialog", { name: "Guided tour" });
  await expect(dialog).toBeVisible();

  const total = Number((await dialog.getByText(/^Step 1 of \d+$/).innerText()).split(" ").pop());
  expect(total).toBe(10);
  const titles: string[] = [];
  for (let i = 1; i <= total; i++) {
    await expect(dialog.getByText(`Step ${i} of ${total}`)).toBeVisible();
    // Each step lights up a real element: the spotlight exists while its target is on the page.
    await expect(page.locator(".tour-spot")).toBeVisible({ timeout: 10_000 });
    titles.push(await dialog.getByRole("heading").innerText());
    if (i < total) await dialog.getByRole("button", { name: "Next" }).click();
  }
  expect(titles).toContain("Read together");
  expect(titles).toContain("Dashboard and calculators");
  expect(titles).toContain("Tools for leaders");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});
