// GDELT DOC 2.0 API client (free, no key). GDELT asks for at most one request every 5 seconds.

export type GdeltArticle = { url: string; title: string; seendate: string; domain: string; sourcecountry?: string };

const BASE = "https://api.gdeltproject.org/api/v2/doc/doc";
const MIN_GAP_MS = 6_000;
let last = 0;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "20261007T121500Z" → ISO string. */
export function gdeltDate(s: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
}

export async function gdeltArticles(query: string, opts: { timespan?: string; max?: number } = {}): Promise<GdeltArticle[]> {
  const params = new URLSearchParams({
    query: `${query} sourcelang:english`,
    mode: "artlist",
    format: "json",
    maxrecords: String(opts.max ?? 75),
    timespan: opts.timespan ?? "24h",
    sort: "datedesc",
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const gap = last + MIN_GAP_MS - Date.now();
    if (gap > 0) await wait(gap);
    last = Date.now();
    const res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(30_000) });
    const body = await res.text();
    if (res.status === 429 || body.startsWith("Please limit")) {
      await wait(MIN_GAP_MS * (attempt + 2));
      continue;
    }
    if (!res.ok) throw new Error(`GDELT ${res.status}`);
    if (!body.trim()) return [];
    const json = JSON.parse(body) as { articles?: GdeltArticle[] };
    return json.articles ?? [];
  }
  throw new Error("GDELT rate limited");
}

/** One query per section; results are re-classified from the headline anyway. */
export const GDELT_SECTION_QUERIES: Record<string, string> = {
  conflict: "(airstrike OR missile OR shelling OR ceasefire OR offensive)",
  summit: "(summit OR NATO OR BRICS OR G20 OR ASEAN)",
  economy: "(inflation OR \"central bank\" OR IMF OR tariff OR recession)",
  defense: "(\"defence budget\" OR \"defense budget\" OR \"arms deal\" OR \"military exercise\")",
  energy: "(OPEC OR LNG OR pipeline OR \"oil prices\" OR \"rare earth\")",
  diplomacy: "(sanctions OR ambassador OR \"foreign minister\" OR \"security council\")",
};
