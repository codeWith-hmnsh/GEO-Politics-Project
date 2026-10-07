// News job (docs/DATA-SOURCES.md §5): trusted RSS feeds + GDELT → classify → geotag → cluster → snapshot "news".
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeSnapshot } from "@/lib/data/store";
import type { NewsSnapshot } from "@/lib/schemas/news";
import { GDELT_SECTION_QUERIES, gdeltArticles, gdeltDate } from "../clients/gdelt";
import { fetchFeed } from "../clients/rss";
import { classify, isExcluded } from "../pipeline/classify";
import { clusterItems, type TaggedItem } from "../pipeline/cluster";
import { makeGeotagger, type GeoCountry } from "../pipeline/geotag";
import { FEEDS, domainOf, trustOf } from "../sources";

const MAX_AGE_MS = 48 * 3600_000;
const KEEP = 200;

type Raw = { title: string; url: string; publishedAt: string | null; hint?: string };

async function fromFeeds(log: (s: string) => void) {
  let ok = 0;
  let failed = 0;
  const out: Raw[] = [];
  const queue = [...FEEDS];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let feed = queue.shift(); feed; feed = queue.shift()) {
        try {
          const items = await fetchFeed(feed.url);
          out.push(...items.map((i) => ({ ...i, hint: feed.hint })));
          ok++;
        } catch (e) {
          failed++;
          log(`feed failed: ${feed.url} (${(e as Error).message})`);
        }
      }
    }),
  );
  return { out, ok, failed };
}

async function fromGdelt(log: (s: string) => void) {
  const out: Raw[] = [];
  for (const [section, query] of Object.entries(GDELT_SECTION_QUERIES)) {
    try {
      const arts = await gdeltArticles(query);
      out.push(...arts.map((a) => ({ title: a.title, url: a.url, publishedAt: gdeltDate(a.seendate), hint: section })));
    } catch (e) {
      log(`GDELT skipped from "${section}": ${(e as Error).message}`);
      break; // rate limited: try again on the next run
    }
  }
  return out;
}

export async function runNews(opts: { gdelt?: boolean; log?: (s: string) => void } = {}) {
  const log = opts.log ?? console.log;
  const countries = JSON.parse(await readFile(join(process.cwd(), "public", "geo", "countries.json"), "utf8")) as GeoCountry[];
  const geotag = makeGeotagger(countries);

  const feeds = await fromFeeds(log);
  const gdelt = opts.gdelt === false ? [] : await fromGdelt(log);
  const raw = [...feeds.out, ...gdelt];

  const now = Date.now();
  const seen = new Set<string>();
  const items: TaggedItem[] = [];
  for (const r of raw) {
    const trust = trustOf(domainOf(r.url));
    if (!trust || seen.has(r.url)) continue;
    const published = r.publishedAt ?? new Date(now).toISOString();
    if (now - Date.parse(published) > MAX_AGE_MS) continue;
    seen.add(r.url);
    const title = r.title.replace(/^(watch|listen|video|live):\s*/i, "").trim();
    if (isExcluded(title)) continue;
    const sections = classify(title, r.hint);
    const geo = geotag(title);
    // Keep world affairs: a section tied to a place, a bloc/diplomacy story, or two countries interacting.
    const international = geo.countries.length >= 2;
    const placed = sections.length > 0 && (geo.countries.length > 0 || sections.includes("summit") || sections.includes("diplomacy"));
    if (!placed && !international) continue;
    items.push({ name: trust.name, domain: trust.domain, tier: trust.tier, url: r.url, title, publishedAt: published, sections, ...geo });
  }

  const clusters = clusterItems(items)
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.sourceCount - a.sourceCount || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, KEEP);

  const snapshot: NewsSnapshot = {
    asOf: new Date().toISOString(),
    clusters,
    stats: { fetched: raw.length, kept: items.length, feedsOk: feeds.ok, feedsFailed: feeds.failed },
  };
  const where = await writeSnapshot("news", snapshot, snapshot.asOf);
  log(`news: ${raw.length} fetched (${gdelt.length} GDELT), ${items.length} kept, ${clusters.length} clusters, ${clusters.filter((c) => c.verified).length} verified → ${where}`);
  return snapshot;
}
