import { expect, test } from "@playwright/test";

// Statecraft solo match on /play (docs4.0 BUILD-PLAN S3): pick a country, take one advised move, lock, read the result.
test("a solo turn can be played end to end", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(120_000);
  await page.goto("/play");
  await expect(page.getByRole("heading", { name: "Who will you lead?" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /India/ }).first().click();
  await page.getByRole("button", { name: /Take office/ }).click();
  await expect(page.getByText("Your goal this year")).toBeVisible();
  await page.getByRole("button", { name: "Skip the tour" }).click();
  await page.getByRole("button", { name: "Do it" }).first().click();
  await page.getByRole("button", { name: "Lock turn" }).click();
  await page.getByRole("button", { name: /Skip/ }).click({ timeout: 15_000 });
  await expect(page.getByText("What your decisions did")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Why?" }).first().click();
  await page.getByRole("button", { name: /Continue to 2027/ }).click();
  await expect(page.getByText("2027 · Briefing")).toBeVisible();
});
