import { expect, type Page } from "@playwright/test";

/** Signs in with the built-in demo account (in memory, nothing real). */
export async function signInDemo(page: Page) {
  await page.goto("/signin");
  await page.locator('input[name="email"]').fill("demo");
  await page.locator('input[name="password"]').fill("demo");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/course/);
}

/** Moves around inside the app without a reload, so the in-memory demo state survives. */
export async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, "", p);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[?.]/g, "\\$&") + "$"));
}

/** Answers "are you sure?" dialogs with yes. */
export function acceptDialogs(page: Page) {
  page.on("dialog", (d) => void d.accept());
}
