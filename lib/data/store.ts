// Snapshot storage shared by ingest jobs and API routes (docs/ARCHITECTURE.md §2, §4 `snapshots`).
// Supabase when configured; otherwise local files so everything works before accounts exist.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Snapshot<T> = { payload: T; asOf: string; origin: "supabase" | "live" | "seed" };

const ROOT = process.cwd();
const LIVE_DIR = join(ROOT, "data", "live");
const SEED_DIR = join(ROOT, "data", "seed");

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function readJson<T>(file: string): Promise<{ asOf: string; payload: T } | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as { asOf: string; payload: T };
  } catch {
    return null;
  }
}

export async function writeSnapshot<T>(key: string, payload: T, asOf = new Date().toISOString()): Promise<"supabase" | "live"> {
  const sb = supabase();
  if (sb) {
    const res = await fetch(`${sb.url}/rest/v1/snapshots?on_conflict=key`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        authorization: `Bearer ${sb.key}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ key, payload, as_of: asOf }),
    });
    if (!res.ok) throw new Error(`Supabase write ${key}: ${res.status} ${await res.text()}`);
    return "supabase";
  }
  await mkdir(LIVE_DIR, { recursive: true });
  await writeFile(join(LIVE_DIR, `${key}.json`), JSON.stringify({ asOf, payload }));
  return "live";
}

/** Newest available snapshot: Supabase → local live file → committed seed. */
export async function readSnapshot<T>(key: string): Promise<Snapshot<T> | null> {
  const sb = supabase();
  if (sb) {
    try {
      const res = await fetch(`${sb.url}/rest/v1/snapshots?key=eq.${encodeURIComponent(key)}&select=payload,as_of`, {
        headers: { apikey: sb.key, authorization: `Bearer ${sb.key}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const rows = (await res.json()) as { payload: T; as_of: string }[];
        if (rows[0]) return { payload: rows[0].payload, asOf: rows[0].as_of, origin: "supabase" };
      }
    } catch {
      // fall through to local copies
    }
  }
  const live = await readJson<T>(join(LIVE_DIR, `${key}.json`));
  if (live) return { ...live, origin: "live" };
  const seed = await readJson<T>(join(SEED_DIR, `${key}.json`));
  return seed ? { ...seed, origin: "seed" } : null;
}
