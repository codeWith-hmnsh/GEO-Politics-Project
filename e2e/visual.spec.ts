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

  test("bloc panel", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.waitForTimeout(5000);
    await page.getByRole("button", { name: /BRICS: show members/ }).click({ force: true });
    await page.waitForTimeout(3500);
    await expect(page.getByRole("heading", { name: "BRICS" })).toBeVisible();
    await page.screenshot({ path: `test-results/visual/${info.project.name}-bloc.png` });
  });

  for (const mode of ["Economy", "Defense"]) {
    test(`${mode} mode with country`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop");
      await page.goto("/");
      await page.waitForTimeout(4500);
      await page.getByRole("navigation", { name: "Mode" }).getByRole("button", { name: mode }).click();
      await expect(page.getByRole("complementary", { name: `${mode} mode` })).toBeVisible();
      // Home layers are gone in a mode.
      await expect(page.getByRole("button", { name: /Russia – Ukraine War/ })).toHaveCount(0);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `test-results/visual/${info.project.name}-${mode.toLowerCase()}.png` });
      const box = (await page.locator("canvas").boundingBox())!;
      await page.mouse.click(box.width * 0.56, box.height * 0.6);
      await page.waitForTimeout(3500);
      await page.screenshot({ path: `test-results/visual/${info.project.name}-${mode.toLowerCase()}-country.png` });
      // Back to Home: mode card gone, Home layers back.
      await page.getByRole("navigation", { name: "Mode" }).getByRole("button", { name: "Global Pulse" }).click();
      await expect(page.getByRole("complementary", { name: `${mode} mode` })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: /Russia – Ukraine War/ }).first()).toBeAttached();
    });
  }

  test("compare two countries in Defense", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.waitForTimeout(4500);
    await page.getByRole("navigation", { name: "Mode" }).getByRole("button", { name: "Defense" }).click();
    const box = (await page.locator("canvas").boundingBox())!;
    await page.mouse.click(box.width * 0.56, box.height * 0.6);
    await page.waitForTimeout(3500);
    await page.getByRole("button", { name: "Compare with…" }).click();
    await expect(page.getByRole("status")).toContainText("Tap another country");
    await page.mouse.click(box.width * 0.41, box.height * 0.37);
    await expect(page.getByText(/^Compare · Defense$/)).toBeVisible();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `test-results/visual/${info.project.name}-compare.png` });
  });

  test("daily brief", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.waitForTimeout(4500);
    await page.getByRole("button", { name: "Daily Brief" }).last().click();
    await expect(page.getByRole("heading", { name: "Today's top stories" })).toBeVisible();
    await page.getByRole("button", { name: /Show on globe/ }).first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `test-results/visual/${info.project.name}-brief.png` });
  });

  test("story tour", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.waitForTimeout(4500);
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Stories" }).click();
    await page.getByRole("button", { name: /Why the Strait of Hormuz matters/ }).click();
    const player = page.getByRole("region", { name: /Story: Why the Strait of Hormuz matters/ });
    await expect(player.getByRole("heading", { name: "A 33 km gap" })).toBeVisible();
    // Side cards step aside during a tour.
    await expect(page.getByRole("complementary", { name: "Layers" })).toHaveCount(0);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `test-results/visual/${info.project.name}-tour.png` });
    await player.getByRole("button", { name: "Pause" }).click();
    await player.getByRole("button", { name: "What's happening now" }).click();
    await expect(player.getByText("What's happening now")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(player).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Layers" })).toBeVisible();
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
