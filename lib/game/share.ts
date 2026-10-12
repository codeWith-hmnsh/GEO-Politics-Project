// Share links for a finished match (BUILD-PLAN S4). The card data travels in the URL, so sharing needs no server.
// These results are not verified yet; server replay verification comes with accounts in S5 (MULTIPLAYER §7).
import { z } from "zod";
import type { Iso3, ScenarioId } from "./engine/types";
import { SEATS } from "./engine/types";

export const ShareSchema = z.object({
  v: z.literal(1),
  c: z.enum(SEATS),
  l: z.string().max(20),
  p: z.number().int().min(0).max(7),
  y0: z.number().int().min(2000).max(2100),
  y1: z.number().int().min(2000).max(2100),
  r0: z.number().int().min(1).max(6),
  r1: z.number().int().min(1).max(6),
  s: z.number().int().min(0).max(1000),
  w: z.boolean(),
  g: z.number().int().min(0).max(8),
  a: z.string().max(140),
  sc: z.enum(["energyShock", "foodCrisis", "tradeWar", "calmStart"]),
});
export type Share = z.infer<typeof ShareSchema>;

const toB64Url = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
};

export function encodeShare(s: Share): string {
  return toB64Url(JSON.stringify(s));
}

export function decodeShare(code: string): Share | null {
  try {
    if (code.length > 1200) return null;
    const parsed = ShareSchema.safeParse(JSON.parse(fromB64Url(code)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const SCENARIO_NAME: Record<ScenarioId, string> = { energyShock: "Energy Shock", foodCrisis: "Food Crisis", tradeWar: "Trade War", calmStart: "Calm Start" };
export const isSeat = (x: string): x is Iso3 => (SEATS as readonly string[]).includes(x);
