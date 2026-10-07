import "server-only";
import { cacheLife } from "next/cache";
import type { IndicatorsSnapshot } from "@/ingest/jobs/indicators";
import capability from "@/data/curated/capability.json";
import { capabilityScores } from "@/lib/capability";
import { METRICS, type MetricId } from "@/lib/metrics";
import type { ApiEnvelope } from "@/lib/schemas/news";
import { readSnapshot } from "./store";

async function getIndicatorsSnapshot() {
  "use cache";
  cacheLife("hours");
  return readSnapshot<IndicatorsSnapshot>("indicators");
}

/** Metrics for one mode (values for the choropleth, series for sparklines). */
export async function getModeIndicators(mode: "economy" | "defense"): Promise<ApiEnvelope<IndicatorsSnapshot["metrics"]>> {
  const snap = await getIndicatorsSnapshot();
  if (!snap) return { data: {}, asOf: null, stale: true, sources: [] };
  const ids = METRICS.filter((m) => m.mode === mode).map((m) => m.id);
  const data = Object.fromEntries(ids.filter((id) => snap.payload.metrics[id]).map((id) => [id, snap.payload.metrics[id]])) as Partial<
    Record<MetricId, IndicatorsSnapshot["metrics"][MetricId]>
  >;
  if (mode === "defense") {
    const year = Math.max(...[snap.payload.metrics.milUsd?.latestYear ?? 0, 2025]);
    const scores = capabilityScores(
      capability.items.map((r) => ({
        ...r,
        personnel: snap.payload.metrics.personnel?.values[r.iso3]?.value,
      })),
    );
    data.capability = {
      latestYear: year,
      values: Object.fromEntries([...scores].map(([iso3, s]) => [iso3, { value: s.overall, year }])),
      series: {},
    };
  }
  return {
    data,
    asOf: snap.asOf,
    stale: snap.origin === "seed" || Date.now() - Date.parse(snap.asOf) > 8 * 24 * 3600_000,
    sources: [...new Set(METRICS.filter((m) => m.mode === mode).map((m) => m.source))],
  };
}
