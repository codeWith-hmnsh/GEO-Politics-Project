import { expect, test } from "@playwright/test";

// Saves reference screenshots for manual comparison with all_refrence-ui/mockups/ (not a pixel diff).
test.describe("visual reference", () => {
  test.skip(({ browserName }) => browserName !== "chromium");
  // Software WebGL in CI is slow; these are reference captures, not timing tests.
  test.setTimeout(120_000);
  // One software-WebGL browser at a time; parallel runs starve the CPU.
  test.describe.configure({ mode: "serial" });

  test("landing globe", async ({ page }, info) => {
    await page.goto("/");
    await page.waitForTimeout(5000);
    await expect(page.locator("canvas")).toBeVisible();
    await page.screenshot({ path: `test-results/visual/${info.project.name}-landing.png` });
  });

  test("country selected", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.waitForTimeout(5000);
    const box = (await page.locator("canvas").boundingBox())!;
    await page.mouse.click(box.width * 0.56, box.height * 0.6);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `test-results/visual/${info.project.name}-selected.png` });
  });

  test("conflict panel", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.waitForTimeout(5000);
    // Markers follow the moving globe, so skip the "stable" wait.
    await page.getByRole("button", { name: /Russia – Ukraine War/ }).last().click({ force: true });
    await page.waitForTimeout(3500);
    await expect(page.getByRole("heading", { name: "Russia – Ukraine War" })).toBeVisible();
    await page.screenshot({ path: `test-results/visual/${info.project.name}-conflict.png` });
  });

  test("zoom to states", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.waitForTimeout(4500);
    const box = (await page.locator("canvas").boundingBox())!;
    await page.mouse.move(box.width * 0.55, box.height * 0.55);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, -320);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `test-results/visual/${info.project.name}-zoom.png` });
  });
});
