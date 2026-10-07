import { expect, test } from "@playwright/test";

test("home renders the brand and the globe canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("GeoPolitics", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("the world");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test("country geometry is served", async ({ request }) => {
  const res = await request.get("/geo/countries.json");
  expect(res.ok()).toBe(true);
  const list = (await res.json()) as { iso3: string }[];
  expect(list.some((c) => c.iso3 === "IND")).toBe(true);
});
