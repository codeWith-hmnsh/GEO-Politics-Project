import { describe, expect, it } from "vitest";
import type { NewsCluster } from "@/lib/schemas/news";
import { rankBrief } from "./brief";

const NOW = Date.parse("2026-10-07T12:00:00Z");

function cluster(id: string, domains: string[], opts: Partial<NewsCluster> = {}): NewsCluster {
  return {
    id,
    title: `Story ${id}`,
    url: "https://example.org/" + id,
    source: "x",
    publishedAt: "2026-10-07T10:00:00Z",
    sections: ["conflict"],
    countries: [id.toUpperCase().padEnd(3, "X")],
    lat: 10,
    lng: 20,
    sourceCount: domains.length,
    verified: domains.length > 1,
    sources: domains.map((d) => ({ name: d, domain: d, tier: 1, url: "https://" + d, title: "t", publishedAt: "2026-10-07T10:00:00Z" })),
    ...opts,
  };
}

describe("rankBrief", () => {
  it("ranks coverage across regions above coverage from one region", () => {
    const oneRegion = cluster("a", ["bbc.co.uk", "dw.com", "france24.com"]);
    const threeRegions = cluster("b", ["bbc.co.uk", "thehindu.com", "aljazeera.com"]);
    expect(rankBrief([oneRegion, threeRegions], { pin: [], hide: [] }, NOW).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("drops stories without a place and honours pins and hides", () => {
    const noPlace = cluster("c", ["bbc.co.uk", "thehindu.com"], { lat: null, lng: null });
    const small = cluster("d", ["bbc.co.uk"]);
    const big = cluster("e", ["bbc.co.uk", "thehindu.com", "cnn.com"]);
    const hidden = cluster("f", ["reuters.com", "nhk.or.jp", "cnn.com"]);
    const out = rankBrief([noPlace, small, big, hidden], { pin: ["Story d"], hide: ["f"] }, NOW);
    expect(out.map((c) => c.id)).toEqual(["d", "e"]);
    expect(out[0].pinned).toBe(true);
  });

  it("keeps one story per lead country and fades old news", () => {
    const fresh = cluster("g", ["bbc.co.uk", "thehindu.com"], { countries: ["IND"] });
    const sameCountry = cluster("h", ["bbc.co.uk", "thehindu.com"], { countries: ["IND"] });
    const old = cluster("i", ["bbc.co.uk", "thehindu.com"], { publishedAt: "2026-10-04T10:00:00Z" });
    const out = rankBrief([old, fresh, sameCountry], { pin: [], hide: [] }, NOW);
    expect(out.map((c) => c.id)).toEqual(["g", "i"]);
  });
});
