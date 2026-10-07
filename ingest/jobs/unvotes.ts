// UN voting job (docs/DATA-SOURCES.md §2.7): how often each pair of countries voted the same way in the UN
// General Assembly, from Bailey, Strezhnev and Voeten's UNGA voting data (Harvard Dataverse) → snapshot "unvotes".
import { writeSnapshot } from "@/lib/data/store";

export type UnVotesSnapshot = {
  asOf: string;
  /** UNGA session year the agreement scores cover. */
  year: number;
  /** agree[a][b] = % of votes in which a and b voted the same way (0–100). */
  agree: Record<string, Record<string, number>>;
};

const DATAVERSE = "https://dataverse.harvard.edu/api/access/datafile";
// File ids in doi:10.7910/DVN/LEJUQZ: country codes (ideal points) and dyadic agreement scores.
const IDEAL_POINTS_FILE = 11824371;
const AGREEMENT_FILE = 11837234;

async function range(id: number, bytes: string) {
  const res = await fetch(`${DATAVERSE}/${id}`, { headers: { range: bytes }, signal: AbortSignal.timeout(600_000) });
  if (res.status !== 206) throw new Error(`Dataverse ${id}: expected a partial response, got ${res.status}`);
  return res.text();
}

async function text(id: number) {
  const res = await fetch(`${DATAVERSE}/${id}`, { signal: AbortSignal.timeout(600_000) });
  if (!res.ok) throw new Error(`Dataverse ${id}: ${res.status}`);
  return res.text();
}

export async function runUnVotes(log: (s: string) => void = console.log) {
  // Correlates of War code → ISO3 from the ideal points table (tab-separated, quoted strings).
  const cow = new Map<string, string>();
  for (const line of (await text(IDEAL_POINTS_FILE)).split("\n").slice(1)) {
    const [ccode, iso] = line.split("\t");
    const iso3 = iso?.replace(/"/g, "");
    if (ccode && iso3 && /^[A-Z]{3}$/.test(iso3)) cow.set(ccode, iso3);
  }
  log(`unvotes: ${cow.size} country codes`);

  // The file is ~145 MB and sorted by session, so fetch only its end: enough bytes to hold the whole latest year.
  const head = (await range(AGREEMENT_FILE, "bytes=0-400")).split("\n")[0].replace(/"/g, "").split(",");
  const [iC1, iC2, iAgree, iYear] = ["ccode1", "ccode2", "agree", "year"].map((k) => head.indexOf(k));
  let rows: string[] = [];
  let year = 0;
  for (let bytes = 3_500_000; bytes <= 30_000_000; bytes *= 2) {
    rows = (await range(AGREEMENT_FILE, `bytes=-${bytes}`)).split("\n").slice(1).filter(Boolean); // drop the cut first line
    const years = rows.map((l) => Number(l.split(",")[iYear]));
    year = Math.max(...years);
    if (years[0] < year) break; // the chunk starts before the latest year, so that year is complete
  }
  const agree: UnVotesSnapshot["agree"] = {};
  for (const line of rows) {
    const f = line.split(",");
    if (Number(f[iYear]) !== year) continue;
    const a = cow.get(f[iC1]);
    const b = cow.get(f[iC2]);
    const v = Number(f[iAgree]);
    if (!a || !b || a === b || !Number.isFinite(v)) continue;
    const pct = Math.round(v * 100);
    (agree[a] ??= {})[b] = pct;
    (agree[b] ??= {})[a] = pct;
  }
  const snapshot: UnVotesSnapshot = { asOf: new Date().toISOString(), year, agree };
  const where = await writeSnapshot("unvotes", snapshot, snapshot.asOf);
  log(`unvotes: ${year} session, ${Object.keys(agree).length} countries → ${where}`);
  return snapshot;
}
