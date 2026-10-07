import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("glossary", () => {
  test.beforeEach(({ browserName }, info) => {
    test.skip(browserName !== "chromium" || info.project.name !== "desktop");
  });
  test.setTimeout(90_000);

  test("page lists 40 terms and passes accessibility checks", async ({ page }) => {
    await page.goto("/glossary");
    await expect(page.locator("dl > div")).toHaveCount(40);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  });

  test("See on globe opens the bloc on the home globe", async ({ page }) => {
    await page.goto("/glossary");
    await page.locator("#quad").getByRole("link", { name: "See on globe" }).click();
    await expect(page.getByRole("heading", { name: "QUAD" })).toBeVisible({ timeout: 30_000 });
  });

  test("term chip in the Economy panel shows a definition", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4500);
    await page.getByRole("navigation", { name: "Mode" }).getByRole("button", { name: "Economy" }).click();
    await page.getByRole("complementary", { name: "Economy mode" }).getByRole("button", { name: "GDP growth" }).click();
    await expect(page.getByText(/after removing price changes/)).toBeVisible();
    await page.getByRole("button", { name: "Recession" }).click();
    await expect(page.getByText(/two quarters in a row/)).toBeVisible();
  });
});
