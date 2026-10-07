// Energy job (docs/DATA-SOURCES.md §2.6): Our World in Data energy dataset → snapshot "energy".
import { writeSnapshot } from "@/lib/data/store";
import type { EnergyMix } from "@/lib/energy";
import type { MetricData, Point } from "./indicators";


export type EnergySnapshot = {
  asOf: string;
  metrics: { clean: MetricData; oilgas: MetricData; imports: MetricData };
  mix: Record<string, EnergyMix>;
};

const URL_OWID = "https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv";
const FIRST_YEAR = 2010;

/** Minimal CSV line split (OWID quotes country names that contain commas). */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function finish(series: Record<string, Point[]>): MetricData {
  const values: MetricData["values"] = {};
  let latestYear: number | null = null;
  for (const [iso3, pts] of Object.entries(series)) {
    pts.sort((a, b) => a[0] - b[0]);
    const last = pts.at(-1);
    if (!last) continue;
    values[iso3] = { value: last[1], year: last[0] };
    latestYear = Math.max(latestYear ?? 0, last[0]);
  }
  return { latestYear, values, series };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export async function runEnergy(log: (s: string) => void = console.log) {
  const res = await fetch(URL_OWID, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`OWID: ${res.status}`);
  const lines = (await res.text()).split("\n").filter(Boolean);
  const head = splitCsv(lines[0]);
  const col = (name: string) => {
    const i = head.indexOf(name);
    if (i < 0) throw new Error(`OWID column missing: ${name}`);
    return i;
  };
  const c = {
    iso: col("iso_code"),
    year: col("year"),
    renew: col("renewables_share_elec"),
    coal: col("coal_share_energy"),
    oil: col("oil_share_energy"),
    gas: col("gas_share_energy"),
    nuclear: col("nuclear_share_energy"),
    hydro: col("hydro_share_energy"),
    solar: col("solar_share_energy"),
    wind: col("wind_share_energy"),
    otherRen: col("other_renewables_share_energy"),
    elec: ["coal", "oil", "gas", "nuclear", "hydro", "solar", "wind", "other_renewables"].map((k) => col(`${k}_share_elec`)),
    oilProd: col("oil_production"),
    gasProd: col("gas_production"),
    oilCons: col("oil_consumption"),
    gasCons: col("gas_consumption"),
  };

  const clean: Record<string, Point[]> = {};
  const oilgas: Record<string, Point[]> = {};
  const imports: Record<string, Point[]> = {};
  const mix: Record<string, EnergyMix> = {};
  for (const line of lines.slice(1)) {
    const f = splitCsv(line);
    const iso3 = f[c.iso];
    const year = Number(f[c.year]);
    // Countries only: OWID aggregates have no ISO code or start with "OWID_".
    if (!/^[A-Z]{3}$/.test(iso3) || year < FIRST_YEAR) continue;
    const num = (i: number) => (f[i] === "" || f[i] === undefined ? null : Number(f[i]));
    const renew = num(c.renew);
    if (renew !== null) (clean[iso3] ??= []).push([year, round1(renew)]);
    const [op, gp, oc, gc] = [num(c.oilProd), num(c.gasProd), num(c.oilCons), num(c.gasCons)];
    if (op !== null || gp !== null) (oilgas[iso3] ??= []).push([year, Math.round((op ?? 0) + (gp ?? 0))]);
    // Net import share of oil and gas use: negative means a net exporter.
    if (oc !== null && gc !== null && oc + gc > 0) {
      (imports[iso3] ??= []).push([year, round1((100 * (oc + gc - (op ?? 0) - (gp ?? 0))) / (oc + gc))]);
    }
    // Prefer the primary-energy mix; fall back to the electricity mix where only that is reported.
    const energy = [c.coal, c.oil, c.gas, c.nuclear, c.hydro, c.solar, c.wind, c.otherRen].map(num);
    const elec = c.elec.map(num);
    const pick = energy.every((v) => v !== null) ? ("energy" as const) : elec.every((v) => v !== null) ? ("electricity" as const) : null;
    const prev = mix[iso3];
    if (pick && (!prev || (pick === "energy" && prev.basis === "electricity") || (pick === prev.basis && prev.year < year))) {
      const [coal, oil, gas, nuclear, hydro, solar, wind, other] = (pick === "energy" ? energy : elec).map((v) => round1(v!));
      mix[iso3] = { year, basis: pick, coal, oil, gas, nuclear, hydro, solar, wind, other };
    }
  }

  const snapshot: EnergySnapshot = {
    asOf: new Date().toISOString(),
    metrics: { clean: finish(clean), oilgas: finish(oilgas), imports: finish(imports) },
    mix,
  };
  const where = await writeSnapshot("energy", snapshot, snapshot.asOf);
  log(
    `energy: clean ${Object.keys(snapshot.metrics.clean.values).length}, oil & gas ${Object.keys(snapshot.metrics.oilgas.values).length}, ` +
      `imports ${Object.keys(snapshot.metrics.imports.values).length}, mix ${Object.keys(mix).length} countries → ${where}`,
  );
  return snapshot;
}
