import { expect, test } from "@playwright/test";

// Statecraft solo match on /play (docs4.0 BUILD-PLAN S3): pick a country, take one advised move, lock, read the result.
test("a solo turn can be played end to end", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(120_000);
  await page.goto("/play/match");
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

test("the Play page leads into a match", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/play");
  await expect(page.getByRole("heading", { name: /Run a country/ })).toBeVisible();
  await page.getByRole("link", { name: /Lead Japan/ }).click();
  await expect(page.getByRole("heading", { name: "Who will you lead?" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /Japan/ }).first()).toHaveClass(/border-\[var\(--gold\)\]/);
});

test("a shared result has a page and a social image", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop");
  const code = Buffer.from(JSON.stringify({ v: 1, c: "JPN", l: "Hana Mori", p: 1, y0: 2026, y1: 2037, r0: 4, r1: 2, s: 690, w: true, g: 1, a: "Kept the lights on.", sc: "calmStart" })).toString("base64url");
  await page.goto(`/play/h/${code}`);
  await expect(page.getByText("Could you do better with Japan?")).toBeVisible();
  const og = await request.get(`/play/h/${code}/opengraph-image`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});
