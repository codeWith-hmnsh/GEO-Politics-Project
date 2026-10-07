// Indicators job (docs/DATA-SOURCES.md §2.4–2.5): IMF DataMapper + World Bank → snapshot "indicators".
import nuclear from "@/data/curated/nuclear.json";
import { writeSnapshot } from "@/lib/data/store";
import type { MetricId } from "@/lib/metrics";

export type Point = [year: number, value: number];
export type MetricData = { latestYear: number | null; values: Record<string, { value: number; year: number }>; series: Record<string, Point[]> };
export type IndicatorsSnapshot = { asOf: string; metrics: Partial<Record<MetricId, MetricData>> };

const IMF: Partial<Record<MetricId, string>> = {
  growth: "NGDP_RPCH",
  inflation: "PCPIPCH",
  unemployment: "LUR",
  debt: "GGXWDG_NGDP",
  gdp: "NGDPD",
};
const WORLD_BANK: Partial<Record<MetricId, string>> = {
  milPct: "MS.MIL.XPND.GD.ZS",
  milUsd: "MS.MIL.XPND.CD",
  personnel: "MS.MIL.TOTL.P1",
  armsImports: "MS.MIL.MPRT.KD",
};

const FIRST_YEAR = 2014;

function finish(series: Record<string, Point[]>, maxYear: number): MetricData {
  const values: MetricData["values"] = {};
  let latestYear: number | null = null;
  for (const [iso3, pts] of Object.entries(series)) {
    pts.sort((a, b) => a[0] - b[0]);
    const latest = [...pts].reverse().find(([y]) => y <= maxYear);
    if (!latest) continue;
    values[iso3] = { value: latest[1], year: latest[0] };
    latestYear = Math.max(latestYear ?? 0, latest[0]);
  }
  return { latestYear, values, series };
}

async function imf(code: string, lastActualYear: number): Promise<MetricData> {
  const res = await fetch(`https://www.imf.org/external/datamapper/api/v1/${code}`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`IMF ${code}: ${res.status}`);
  const json = (await res.json()) as { values?: Record<string, Record<string, Record<string, number | null>>> };
  const byCountry = json.values?.[code] ?? {};
  const series: Record<string, Point[]> = {};
  for (const [iso3, years] of Object.entries(byCountry)) {
    if (iso3.length !== 3) continue; // skip regions and groups
    const pts = Object.entries(years)
      .map(([y, v]) => [Number(y), v] as const)
      .filter((p): p is [number, number] => p[1] !== null && Number.isFinite(p[1]) && p[0] >= FIRST_YEAR && p[0] <= lastActualYear + 1);
    // NGDPD is reported in billions of US dollars.
    const scale = code === "NGDPD" ? 1e9 : 1;
    if (pts.length) series[iso3] = pts.map(([y, v]) => [y, Math.round(v * scale * 100) / 100]);
  }
  // "Latest" is the last year with actual data or a current-year estimate, never a multi-year forecast.
  return finish(series, lastActualYear);
}

async function worldBank(code: string, lastYear: number): Promise<MetricData> {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=${FIRST_YEAR}:${lastYear}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`World Bank ${code}: ${res.status}`);
  const json = (await res.json()) as [unknown, { countryiso3code: string; date: string; value: number | null }[] | null];
  const series: Record<string, Point[]> = {};
  for (const row of json[1] ?? []) {
    if (!row.countryiso3code || row.value === null) continue;
    (series[row.countryiso3code] ??= []).push([Number(row.date), row.value]);
  }
  return finish(series, lastYear);
}

export async function runIndicators(log: (s: string) => void = console.log) {
  const year = new Date().getUTCFullYear();
  const metrics: IndicatorsSnapshot["metrics"] = {};
  for (const [id, code] of Object.entries(IMF) as [MetricId, string][]) {
    try {
      metrics[id] = await imf(code, year);
      log(`IMF ${code}: ${Object.keys(metrics[id]!.values).length} countries (latest ${metrics[id]!.latestYear})`);
    } catch (e) {
      log(`IMF ${code} failed: ${(e as Error).message}`);
    }
  }
  for (const [id, code] of Object.entries(WORLD_BANK) as [MetricId, string][]) {
    try {
      metrics[id] = await worldBank(code, year);
      log(`World Bank ${code}: ${Object.keys(metrics[id]!.values).length} countries (latest ${metrics[id]!.latestYear})`);
    } catch (e) {
      log(`World Bank ${code} failed: ${(e as Error).message}`);
    }
  }
  const nukeYear = 2025;
  metrics.nuclear = {
    latestYear: nukeYear,
    values: Object.fromEntries(nuclear.items.map((n) => [n.iso3, { value: n.warheads, year: nukeYear }])),
    series: {},
  };
  const snapshot: IndicatorsSnapshot = { asOf: new Date().toISOString(), metrics };
  const where = await writeSnapshot("indicators", snapshot, snapshot.asOf);
  log(`indicators: ${Object.keys(metrics).length} metrics → ${where}`);
  return snapshot;
}
