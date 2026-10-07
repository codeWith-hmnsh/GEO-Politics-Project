import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] } });

test("shows the 2D map when WebGL is not available", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const map = page.getByRole("region", { name: /World map \(2D view/ });
  await expect(map).toBeVisible();
  await expect(map.locator("path")).not.toHaveCount(0);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/visual/fallback-2d.png" });
});
