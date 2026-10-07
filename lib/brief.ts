// Daily Brief ranking (docs/PRD.md §6, FR-E-04): top stories by trusted coverage across regions.
import sources from "@/config/sources.json";
import type { NewsCluster } from "@/lib/schemas/news";

export type BriefPins = { pin: string[]; hide: string[] };
export type BriefItem = NewsCluster & { score: number; regions: string[]; pinned: boolean };

const OUTLETS = sources.tiers as Record<string, { name: string; tier: number; region: string }>;
const TIER_WEIGHT: Record<number, number> = { 1: 1, 2: 0.7, 3: 0.3 };

/** Pins and hides match a cluster id or a case-insensitive piece of its headline. */
const matches = (c: NewsCluster, rules: string[]) => rules.some((r) => c.id === r || c.title.toLowerCase().includes(r.toLowerCase()));

/**
 * score = Σ tier weight of distinct outlets × (1 + 0.5 × (regions − 1)) × e^(−age / 24 h).
 * Only stories with a place on the map can be in the brief, because tapping one flies there.
 */
export function rankBrief(clusters: NewsCluster[], pins: BriefPins, now = Date.now(), size = 5): BriefItem[] {
  const scored = clusters
    .filter((c) => c.lat !== null && c.lng !== null && !matches(c, pins.hide))
    .map((c) => {
      const outlets = new Map<string, number>();
      const regions = new Set<string>();
      for (const s of c.sources) {
        const o = OUTLETS[s.domain];
        outlets.set(o?.name ?? s.name, TIER_WEIGHT[o?.tier ?? s.tier] ?? 0.3);
        if (o?.region) regions.add(o.region);
      }
      const coverage = [...outlets.values()].reduce((a, b) => a + b, 0);
      const ageHours = Math.max(0, (now - Date.parse(c.publishedAt)) / 3_600_000);
      const score = coverage * (1 + 0.5 * Math.max(0, regions.size - 1)) * Math.exp(-ageHours / 24);
      return { ...c, score: Math.round(score * 100) / 100, regions: [...regions].sort(), pinned: matches(c, pins.pin) };
    });
  // Pinned stories first, then by score; one story per lead country keeps the brief varied.
  scored.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score);
  const out: BriefItem[] = [];
  const leads = new Set<string>();
  for (const c of scored) {
    const lead = c.countries[0] ?? c.id;
    if (!c.pinned && leads.has(lead)) continue;
    leads.add(lead);
    out.push(c);
    if (out.length === size) break;
  }
  return out;
}
