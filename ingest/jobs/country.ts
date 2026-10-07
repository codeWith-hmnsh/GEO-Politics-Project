// Country facts jobs (docs/DATA-SOURCES.md): Wikidata profiles and UN Comtrade top trade partners.
import countries from "i18n-iso-countries";
import overrides from "@/config/profile-overrides.json";
import { writeSnapshot } from "@/lib/data/store";

export type Profile = { capital?: string; headOfState?: string; headOfGovernment?: string };
export type ProfilesSnapshot = { asOf: string; profiles: Record<string, Profile> };

export type Partner = { iso3: string; value: number };
export type TradeRow = { year: number; exports: Partner[]; imports: Partner[]; exportsTotal: number; importsTotal: number };
export type TradeSnapshot = { asOf: string; trade: Record<string, TradeRow> };

const UA = "GeoPoliticsBot/0.1 (education project; https://github.com/)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PROFILE_QUERY = `
SELECT ?iso
  (GROUP_CONCAT(DISTINCT ?capitalLabel; separator="|") AS ?capital)
  (GROUP_CONCAT(DISTINCT ?headLabel; separator="|") AS ?heads)
  (GROUP_CONCAT(DISTINCT ?govtLabel; separator="|") AS ?govts)
WHERE {
  ?c wdt:P298 ?iso; wdt:P31 wd:Q6256.
  # Current statements only: skip deprecated ones and any whose end date has passed.
  OPTIONAL { ?c p:P36 ?sc. ?sc ps:P36 ?capital. FILTER NOT EXISTS { ?sc pq:P582 ?e1 FILTER(?e1 < NOW()) } FILTER NOT EXISTS { ?sc wikibase:rank wikibase:DeprecatedRank } ?capital rdfs:label ?capitalLabel. FILTER(LANG(?capitalLabel) = "en") }
  OPTIONAL { ?c p:P35 ?sh. ?sh ps:P35 ?head. FILTER NOT EXISTS { ?sh pq:P582 ?e2 FILTER(?e2 < NOW()) } FILTER NOT EXISTS { ?sh wikibase:rank wikibase:DeprecatedRank } ?head rdfs:label ?headLabel. FILTER(LANG(?headLabel) = "en") }
  OPTIONAL { ?c p:P6 ?sg. ?sg ps:P6 ?govt. FILTER NOT EXISTS { ?sg pq:P582 ?e3 FILTER(?e3 < NOW()) } FILTER NOT EXISTS { ?sg wikibase:rank wikibase:DeprecatedRank } ?govt rdfs:label ?govtLabel. FILTER(LANG(?govtLabel) = "en") }
}
GROUP BY ?iso`;

export async function runProfiles(log: (s: string) => void = console.log) {
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(PROFILE_QUERY)}`, {
    headers: { accept: "application/sparql-results+json", "user-agent": UA },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Wikidata: ${res.status}`);
  type Cell = { value: string } | undefined;
  const json = (await res.json()) as { results: { bindings: Record<string, Cell>[] } };
  const profiles: Record<string, Profile> = {};
  for (const b of json.results.bindings) {
    const iso = b.iso?.value;
    if (!iso) continue;
    // Several "best rank" values mean Wikidata itself is ambiguous; show them all rather than pick one.
    const all = (c: Cell) => c?.value.split("|").filter(Boolean).join(" / ") || undefined;
    const fix = (overrides as Record<string, Partial<Profile>>)[iso] ?? {};
    profiles[iso] = { capital: fix.capital ?? all(b.capital), headOfState: all(b.heads), headOfGovernment: all(b.govts) };
  }
  const snapshot: ProfilesSnapshot = { asOf: new Date().toISOString(), profiles };
  const where = await writeSnapshot("profiles", snapshot, snapshot.asOf);
  log(`profiles: ${Object.keys(profiles).length} countries → ${where}`);
  return snapshot;
}

// Comtrade uses its own codes for a few reporters.
const COMTRADE_OVERRIDES: Record<string, number> = { IND: 699, USA: 842, FRA: 251, NOR: 579, CHE: 757, TWN: 490 };
const OVERRIDE_BACK = new Map(Object.entries(COMTRADE_OVERRIDES).map(([iso, n]) => [n, iso]));

const toComtrade = (iso3: string) => COMTRADE_OVERRIDES[iso3] ?? Number(countries.alpha3ToNumeric(iso3));
const fromComtrade = (code: number) => OVERRIDE_BACK.get(code) ?? countries.numericToAlpha3(String(code).padStart(3, "0"));

/** The largest economies first; the preview API is rate limited, so the list is capped. */
export const TRADE_REPORTERS = [
  "USA", "CHN", "DEU", "JPN", "IND", "GBR", "FRA", "ITA", "CAN", "BRA", "RUS", "KOR", "AUS", "MEX", "ESP", "IDN", "NLD", "SAU", "TUR",
  "CHE", "POL", "TWN", "BEL", "SWE", "IRL", "ARG", "ARE", "NOR", "ISR", "THA", "SGP", "MYS", "VNM", "PHL", "BGD", "EGY", "ZAF", "NGA",
  "PAK", "IRN", "CHL", "COL", "KAZ", "UKR", "QAT", "NZL", "DNK", "AUT", "FIN", "PRT", "GRC", "CZE", "HUN", "ROU", "KEN", "ETH", "MAR",
  "PER", "IRQ", "DZA", "LKA", "NPL", "MMR",
];

type ComtradeRow = { partnerCode: number; flowCode: string; primaryValue: number; isAggregate?: boolean };

async function comtrade(reporter: number, year: number): Promise<ComtradeRow[]> {
  const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=${reporter}&period=${year}&cmdCode=TOTAL&flowCode=X,M`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
      if (res.status === 429) {
        await sleep(5000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(String(res.status));
      return ((await res.json()) as { data?: ComtradeRow[] }).data ?? [];
    } catch {
      await sleep(3000 * (attempt + 1));
    }
  }
  throw new Error("Comtrade unreachable");
}

export async function runTrade(log: (s: string) => void = console.log) {
  const thisYear = new Date().getUTCFullYear();
  const trade: Record<string, TradeRow> = {};
  for (const iso3 of TRADE_REPORTERS) {
    const code = toComtrade(iso3);
    if (!code) continue;
    try {
      let rows: ComtradeRow[] = [];
      let year = thisYear - 1;
      for (; year >= thisYear - 3; year--) {
        rows = await comtrade(code, year);
        if (rows.some((r) => r.partnerCode !== 0)) break;
        await sleep(1200);
      }
      const side = (flow: "X" | "M") => {
        const all = rows.filter((r) => r.flowCode === flow);
        const total = all.find((r) => r.partnerCode === 0)?.primaryValue ?? 0;
        const partners = all
          .filter((r) => r.partnerCode !== 0)
          .map((r) => ({ iso3: fromComtrade(r.partnerCode), value: r.primaryValue }))
          .filter((p): p is Partner => !!p.iso3 && p.iso3 !== iso3)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        return { total, partners };
      };
      const x = side("X");
      const m = side("M");
      if (x.partners.length || m.partners.length) {
        trade[iso3] = { year, exports: x.partners, imports: m.partners, exportsTotal: x.total, importsTotal: m.total };
      }
      log(`trade ${iso3}: ${year} (${x.partners.length}/${m.partners.length})`);
    } catch (e) {
      log(`trade ${iso3} failed: ${(e as Error).message}`);
    }
    await sleep(1200);
  }
  const snapshot: TradeSnapshot = { asOf: new Date().toISOString(), trade };
  const where = await writeSnapshot("trade", snapshot, snapshot.asOf);
  log(`trade: ${Object.keys(trade).length} countries → ${where}`);
  return snapshot;
}
