import type { NewsCluster, NewsSource, Section } from "@/lib/schemas/news";

export type TaggedItem = NewsSource & {
  sections: Section[];
  countries: string[];
  lat: number | null;
  lng: number | null;
};

const STOP = new Set(
  "the a an and or of to in on for with at by from as is are was were be been after over into amid says say said new about against its it their his her has have will would could more than this that what why how who live latest update".split(
    " ",
  ),
);

export function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter === 0 ? 0 : inter / (a.size + b.size - inter);
}

const WINDOW_MS = 24 * 3600_000;
const SIMILAR = 0.22;

/**
 * Group headlines about the same event: similar wording, overlapping countries (or none), within 24 h.
 * A cluster is `verified` when two or more different Tier 1/2 outlets report it (the 2-source rule).
 */
export function clusterItems(items: TaggedItem[]): NewsCluster[] {
  const sorted = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const groups: { items: TaggedItem[]; toks: Set<string>[]; countries: Set<string>; time: number }[] = [];

  for (const it of sorted) {
    const tok = tokens(it.title);
    const time = Date.parse(it.publishedAt);
    // Compare with each member headline (not the union) so big clusters do not stop matching.
    const match = groups.find((g) => {
      if (Math.abs(g.time - time) > WINDOW_MS) return false;
      const sharesCountry = it.countries.length === 0 || g.countries.size === 0 || it.countries.some((c) => g.countries.has(c));
      return sharesCountry && g.toks.some((t) => jaccard(t, tok) >= SIMILAR);
    });
    if (match) {
      match.items.push(it);
      match.toks.push(tok);
      for (const c of it.countries) match.countries.add(c);
    } else {
      groups.push({ items: [it], toks: [tok], countries: new Set(it.countries), time });
    }
  }

  return groups.map((g) => {
    const lead = [...g.items].sort((a, b) => a.tier - b.tier || b.publishedAt.localeCompare(a.publishedAt))[0];
    const outlets = new Set(g.items.filter((i) => i.tier <= 2).map((i) => i.domain));
    const sections = [...new Set(g.items.flatMap((i) => i.sections))];
    // Lead country = the one most headlines mention (ties: the lead headline's own order), not whichever came first.
    const mentions = (c: string) => g.items.filter((i) => i.countries.includes(c)).length;
    const leadRank = (c: string) => (lead.countries.includes(c) ? lead.countries.indexOf(c) : Infinity);
    const countries = [...g.countries].sort((a, b) => mentions(b) - mentions(a) || leadRank(a) - leadRank(b));
    const located =
      [lead, ...g.items].find((i) => i.lat !== null && i.countries[0] === countries[0]) ??
      g.items.find((i) => i.lat !== null) ??
      lead;
    return {
      id: hash(lead.url),
      title: lead.title,
      url: lead.url,
      source: lead.name,
      publishedAt: g.items.map((i) => i.publishedAt).sort().at(-1)!,
      sections,
      countries,
      lat: located.lat,
      lng: located.lng,
      sourceCount: new Set(g.items.map((i) => i.domain)).size,
      verified: outlets.size >= 2,
      sources: g.items.map(({ name, domain, tier, url, title, publishedAt }) => ({ name, domain, tier, url, title, publishedAt })),
    };
  });
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
