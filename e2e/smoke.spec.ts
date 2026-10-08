import { expect, test, type Page } from "@playwright/test";

/** On a phone the language button lives inside the menu; open it if the button is not showing. */
async function languageButton(page: Page, name: string) {
  const button = page.getByRole("button", { name }).locator("visible=true").first();
  if (!(await button.isVisible())) {
    await page.getByRole("button", { name: /Open menu|Abrir menú/ }).click();
  }
  return page.getByRole("button", { name }).locator("visible=true").first();
}

test("the home page loads and the language can be switched", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One source");
  // The skip link is the first thing a keyboard user reaches.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  await (await languageButton(page, "Language and text size")).click();
  await page.getByRole("button", { name: "Español" }).locator("visible=true").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Una fuente");
  await (await languageButton(page, "Idioma y tamaño del texto")).click();
  await page.getByRole("button", { name: "English" }).locator("visible=true").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One source");
});

test("signing up asks for both names before it does anything", async ({ page }) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Create one" }).click();
  await page.locator('input[name="email"]').fill("new@example.com");
  await page.locator('input[name="password"]').fill("abcdef");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your preferred name and your full name.")).toBeVisible();
});

test("the testimony section is on the home page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My Testimony" })).toBeVisible();
});

test("the home page tells a short story, and the About page holds the rest", async ({ page }) => {
  await page.goto("/");
  for (const heading of ["What you'll learn", "How it works", "See it in action", "Questions, answered", "Start with the Introduction"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeAttached();
  }
  // Three phone screenshots, each described.
  await expect(page.locator(".phone img")).toHaveCount(3);
  // A question opens to show its answer.
  const q = page.getByText("Is it really free?");
  await q.scrollIntoViewIfNeeded();
  await q.click();
  await expect(page.getByText("There is nothing to buy.")).toBeVisible();
  // The founder's story starts short and expands.
  await page.getByRole("button", { name: "Keep reading my story" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Keep reading my story" }).click();
  await expect(page.getByText("Joseph", { exact: false }).first()).toBeVisible();

  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("About 4 Rivers");
  await expect(page.getByRole("heading", { name: "Multiple Streams of Income" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
});
