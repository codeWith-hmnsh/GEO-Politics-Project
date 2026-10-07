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

test("news and pulse APIs return data with freshness", async ({ request }) => {
  const news = await (await request.get("/api/news?limit=5")).json();
  expect(Array.isArray(news.data)).toBe(true);
  expect(news.data.length).toBeGreaterThan(0);
  expect(news.data[0]).toHaveProperty("verified");
  expect(typeof news.asOf).toBe("string");

  const conflict = await (await request.get("/api/news?section=conflict&limit=50")).json();
  for (const c of conflict.data) expect(c.sections).toContain("conflict");

  const pulse = await (await request.get("/api/pulse")).json();
  expect(pulse.data.conflicts.length).toBeGreaterThan(0);
  expect(pulse.data.organizations.some((o: { id: string }) => o.id === "NATO")).toBe(true);
});

test("indicators API returns economy and defense metrics", async ({ request }) => {
  const eco = await (await request.get("/api/indicators?mode=economy")).json();
  expect(Object.keys(eco.data)).toEqual(expect.arrayContaining(["growth", "inflation", "debt"]));
  expect(eco.data.growth.values.IND.value).toEqual(expect.any(Number));
  const def = await (await request.get("/api/indicators?mode=defense")).json();
  expect(def.data.capability.values.USA.value).toBeGreaterThan(9);
  expect((await request.get("/api/indicators?mode=bogus")).status()).toBe(400);
});
