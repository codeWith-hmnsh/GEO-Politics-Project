import "server-only";
import { cacheLife } from "next/cache";
import type { ApiEnvelope, NewsCluster, NewsSnapshot, Section } from "@/lib/schemas/news";
import { readSnapshot } from "./store";

const STALE_AFTER_MS = 45 * 60_000;

/** Latest news snapshot, cached for a few minutes (ingest refreshes it every 15 minutes). */
export async function getNewsSnapshot() {
  "use cache";
  cacheLife("minutes");
  return readSnapshot<NewsSnapshot>("news");
}

export type NewsQuery = { section?: Section | "all"; country?: string; limit?: number; verifiedOnly?: boolean };

export function filterNews(clusters: NewsCluster[], q: NewsQuery): NewsCluster[] {
  return clusters
    .filter((c) => !q.section || q.section === "all" || c.sections.includes(q.section))
    .filter((c) => !q.country || c.countries.includes(q.country))
    .filter((c) => !q.verifiedOnly || c.verified)
    .slice(0, q.limit ?? 30);
}

export async function getNews(q: NewsQuery): Promise<ApiEnvelope<NewsCluster[]>> {
  const snap = await getNewsSnapshot();
  if (!snap) return { data: [], asOf: null, stale: true, sources: [] };
  const data = filterNews(snap.payload.clusters, q);
  return {
    data,
    asOf: snap.asOf,
    stale: snap.origin === "seed" || Date.now() - Date.parse(snap.asOf) > STALE_AFTER_MS,
    sources: [...new Set(data.flatMap((c) => c.sources.map((s) => s.name)))],
  };
}
