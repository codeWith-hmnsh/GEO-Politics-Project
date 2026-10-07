import "server-only";
import { cacheLife } from "next/cache";
import type { IndicatorsSnapshot } from "@/ingest/jobs/indicators";
import capability from "@/data/curated/capability.json";
import minerals from "@/data/curated/minerals.json";
import type { EnergySnapshot } from "@/ingest/jobs/energy";
import { capabilityScores } from "@/lib/capability";
import { METRICS, type ChoroplethMode, type MetricId } from "@/lib/metrics";
import type { ApiEnvelope } from "@/lib/schemas/news";
import { readSnapshot } from "./store";

async function getIndicatorsSnapshot() {
  "use cache";
  cacheLife("hours");
  return readSnapshot<IndicatorsSnapshot>("indicators");
}

/** Metrics for one mode (values for the choropleth, series for sparklines). */
async function getEnergySnapshot() {
  "use cache";
  cacheLife("hours");
  return readSnapshot<EnergySnapshot>("energy");
}

/** Largest world production share per country across the curated critical minerals. */
function mineralsMetric() {
  const best: Record<string, number> = {};
  for (const m of Object.values(minerals.minerals)) {
    for (const [iso3, share] of Object.entries(m.shares as Record<string, number>)) best[iso3] = Math.max(best[iso3] ?? 0, share);
  }
  return { latestYear: minerals.year, values: Object.fromEntries(Object.entries(best).map(([k, v]) => [k, { value: v, year: minerals.year }])), series: {} };
}

export async function getModeIndicators(mode: ChoroplethMode): Promise<ApiEnvelope<IndicatorsSnapshot["metrics"]>> {
  if (mode === "energy") {
    const energy = await getEnergySnapshot();
    const sources = [...new Set(METRICS.filter((m) => m.mode === "energy").map((m) => m.source))];
    if (!energy) return { data: { minerals: mineralsMetric() }, asOf: null, stale: true, sources };
    return {
      data: { ...energy.payload.metrics, minerals: mineralsMetric() },
      asOf: energy.asOf,
      stale: energy.origin === "seed" || Date.now() - Date.parse(energy.asOf) > 8 * 24 * 3600_000,
      sources,
    };
  }
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
