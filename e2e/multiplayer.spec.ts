import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Statecraft private room (docs4.0 BUILD-PLAN S5): two guests in two browsers create, join, start and play one year.
// Needs the Supabase keys in .env.local; skipped without them.
const configured = existsSync(".env.local") && /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\S+/.test(readFileSync(".env.local", "utf8"));

test("two leaders play a year in a private room", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop" || !configured);
  test.setTimeout(180_000);
  const host = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const guest = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();

  await host.goto("/play");
  await host.getByRole("button", { name: "Create room" }).click();
  await host.waitForURL(/\/play\/room\/[A-Z2-9]{5}$/, { timeout: 60_000 });
  const code = host.url().slice(-5);
  await expect(host.getByRole("heading", { name: `Room ${code}` })).toBeVisible({ timeout: 30_000 });

  await guest.goto("/play");
  await guest.getByRole("button", { name: "Join with code" }).click();
  await guest.getByRole("textbox", { name: "Room code" }).fill(code);
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await expect(guest.getByText("Waiting for the host to start…")).toBeVisible({ timeout: 60_000 });
  await guest.getByRole("button", { name: /United States/ }).click();
  await expect(guest.getByRole("button", { name: /United States/ })).toContainText("(you)", { timeout: 15_000 });
  await expect(host.getByText("2 leaders in the room")).toBeVisible({ timeout: 15_000 });

  await host.getByRole("button", { name: "Start the match" }).click();
  for (const p of [host, guest]) await expect(p.getByText("Your goal this year")).toBeVisible({ timeout: 60_000 });
  await expect(host.getByTitle("Room code")).toHaveText(code);

  await host.getByRole("button", { name: "Lock turn" }).click();
  await expect(host.getByText("Locked · waiting for the others")).toBeVisible({ timeout: 15_000 });
  await guest.getByRole("button", { name: "Lock turn" }).click();
  for (const p of [host, guest]) {
    // the second page's reveal may already have played while the first was checked
    await p
      .getByRole("button", { name: /Skip/ })
      .click({ timeout: 5_000 })
      .catch(() => {});
    await expect(p.getByText("What your decisions did")).toBeVisible({ timeout: 60_000 });
    await p.getByRole("button", { name: /Continue to 2027/ }).click();
    await expect(p.getByText("2027 · Briefing")).toBeVisible({ timeout: 15_000 });
  }
});
