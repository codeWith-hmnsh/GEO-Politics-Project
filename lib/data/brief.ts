import "server-only";
import { cacheLife } from "next/cache";
import pins from "@/config/brief-pins.json";
import { rankBrief, type BriefItem } from "@/lib/brief";
import type { ApiEnvelope } from "@/lib/schemas/news";
import { getNewsSnapshot } from "./news";

/** Top 5 stories, re-ranked at most once an hour (PRD §6 Daily Brief). */
export async function getBrief(): Promise<ApiEnvelope<BriefItem[]>> {
  "use cache";
  cacheLife("hours");
  const snap = await getNewsSnapshot();
  if (!snap) return { data: [], asOf: null, stale: true, sources: [] };
  const data = rankBrief(snap.payload.clusters, pins);
  return {
    data,
    asOf: snap.asOf,
    stale: snap.origin === "seed",
    sources: [...new Set(data.flatMap((c) => c.sources.map((s) => s.name)))],
  };
}
