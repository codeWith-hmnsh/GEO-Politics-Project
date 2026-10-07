"use client";

// Device tiering (docs/ARCHITECTURE.md §3.5): weak GPUs get a lighter globe.
// Tier 1 = light (no clouds, fewer arcs, lower resolution); tier 2+ = full.

export type Tier = 1 | 2 | 3;

/** `?tier=1` in the URL forces a tier (testing); Data Saver forces the light globe. */
export function tierOverride(): Tier | null {
  try {
    const q = new URLSearchParams(window.location.search).get("tier");
    if (q === "1" || q === "2" || q === "3") return Number(q) as Tier;
  } catch {
    // ignore
  }
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData ? 1 : null;
}

/** Best guess of the device tier from detect-gpu's benchmark data (self-hosted under /benchmarks). */
export async function detectTier(): Promise<Tier> {
  const forced = tierOverride();
  if (forced) return forced;
  try {
    const { getGPUTier } = await import("detect-gpu");
    const r = await getGPUTier({ benchmarksURL: "/benchmarks" });
    // detect-gpu: 0 = unsupported or blocklisted, 1 = < 15 fps, 2 = < 30 fps, 3 = 60 fps+.
    if (r.tier <= 1) return 1;
    return r.tier === 2 ? 2 : 3;
  } catch {
    return 2;
  }
}

/** Arc budget for a tier: the light globe draws half as many. */
export const arcBudget = (n: number, tier: Tier) => (tier === 1 ? Math.max(1, Math.ceil(n / 2)) : n);
