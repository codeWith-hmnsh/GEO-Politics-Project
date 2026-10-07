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

test("country API returns leaders and trade partners", async ({ request }) => {
  const body = await (await request.get("/api/country?iso3=IND")).json();
  expect(body.data.profile.capital).toBe("New Delhi");
  expect(body.data.trade.exports.length).toBeGreaterThan(0);
  const pak = await (await request.get("/api/country?iso3=PAK")).json();
  expect(pak.data.creditors.creditors.length).toBeGreaterThan(0);
  expect((await request.get("/api/country?iso3=12")).status()).toBe(400);
});

test("brief API returns up to five ranked stories with a place", async ({ request }) => {
  const body = await (await request.get("/api/brief")).json();
  expect(body.data.length).toBeGreaterThan(0);
  expect(body.data.length).toBeLessThanOrEqual(5);
  for (const c of body.data) expect(c.lat).toEqual(expect.any(Number));
});

test("energy indicators include clean power, imports and minerals", async ({ request }) => {
  const body = await (await request.get("/api/indicators?mode=energy")).json();
  expect(body.data.clean.values.IND.value).toEqual(expect.any(Number));
  expect(body.data.imports.values.SAU.value).toBeLessThan(0);
  expect(body.data.minerals.values.COD.value).toBeGreaterThan(50);
  const ind = await (await request.get("/api/country?iso3=IND")).json();
  expect(ind.data.mix.coal).toBeGreaterThan(0);
  expect(ind.data.crude.suppliers.length).toBeGreaterThan(0);
});

test("UN votes API returns alignment for a country", async ({ request }) => {
  const body = await (await request.get("/api/unvotes?iso3=IND")).json();
  expect(body.data.year).toBeGreaterThanOrEqual(2024);
  expect(body.data.agree.USA).toEqual(expect.any(Number));
  expect((await request.get("/api/unvotes?iso3=1")).status()).toBe(400);
});
