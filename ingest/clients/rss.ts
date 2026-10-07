import { XMLParser } from "fast-xml-parser";

export type FeedItem = { title: string; url: string; publishedAt: string | null };

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text" });

const text = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in v) return String((v as Record<string, unknown>)["#text"]);
  return "";
};
const asArray = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function linkOf(v: unknown): string {
  for (const l of asArray(v as unknown)) {
    if (typeof l === "string") return l;
    if (l && typeof l === "object") {
      const o = l as Record<string, unknown>;
      if (typeof o["@href"] === "string" && (o["@rel"] === undefined || o["@rel"] === "alternate")) return o["@href"];
      if (typeof o["#text"] === "string") return o["#text"];
    }
  }
  return "";
}

function toIso(raw: string): string | null {
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Parse RSS 2.0, RSS 1.0 (RDF) and Atom into headline + link + time. */
export function parseFeed(xml: string): FeedItem[] {
  const doc = parser.parse(xml) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const items = [
    ...asArray(doc.rss?.channel?.item),
    ...asArray(doc["rdf:RDF"]?.item),
    ...asArray(doc.feed?.entry),
  ] as Record<string, unknown>[];
  const out: FeedItem[] = [];
  for (const it of items) {
    const title = text(it.title).replace(/\s+/g, " ").trim();
    const url = linkOf(it.link) || text(it.guid);
    const date = text(it.pubDate) || text(it["dc:date"]) || text(it.published) || text(it.updated);
    if (title && /^https?:\/\//.test(url)) out.push({ title, url, publishedAt: date ? toIso(date) : null });
  }
  return out;
}

export async function fetchFeed(url: string, timeoutMs = 20_000): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "GeoPoliticsBot/0.1 (+https://github.com/; headlines and links only)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return parseFeed(await res.text());
}
