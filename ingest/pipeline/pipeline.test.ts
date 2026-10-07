import { describe, expect, it } from "vitest";
import { parseFeed } from "../clients/rss";
import { gdeltDate } from "../clients/gdelt";
import { domainOf, trustOf } from "../sources";
import { classify } from "./classify";
import { clusterItems, type TaggedItem } from "./cluster";
import { makeGeotagger } from "./geotag";

const geotag = makeGeotagger([
  { iso3: "IND", name: "India", centroid: [22.5, 79] },
  { iso3: "PAK", name: "Pakistan", centroid: [30, 70] },
  { iso3: "SDN", name: "Sudan", centroid: [15, 30] },
  { iso3: "SSD", name: "S. Sudan", centroid: [7, 30] },
  { iso3: "UKR", name: "Ukraine", centroid: [49, 32] },
  { iso3: "RUS", name: "Russia", centroid: [60, 90] },
]);

const item = (over: Partial<TaggedItem>): TaggedItem => ({
  name: "BBC",
  domain: "bbc.co.uk",
  tier: 1,
  url: "https://bbc.co.uk/a",
  title: "",
  publishedAt: "2026-10-07T10:00:00.000Z",
  sections: [],
  countries: [],
  lat: null,
  lng: null,
  ...over,
});

describe("sources", () => {
  it("normalises domains and applies tiers and blocks", () => {
    expect(domainOf("https://www.bbc.co.uk/news/world-1")).toBe("bbc.co.uk");
    expect(domainOf("https://edition.cnn.com/x")).toBe("cnn.com");
    expect(trustOf("bbc.co.uk")?.tier).toBe(1);
    expect(trustOf("rt.com")).toBeNull();
    expect(trustOf("random-blog.example")).toBeNull();
  });
});

describe("feeds", () => {
  it("parses RSS, RDF and Atom", () => {
    const rss = `<rss><channel><item><title><![CDATA[Ceasefire talks resume]]></title><link>https://bbc.co.uk/1</link><pubDate>Tue, 07 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    const rdf = `<rdf:RDF><item><title>Oil prices rise</title><link>https://dw.com/2</link><dc:date>2026-10-07T09:00:00Z</dc:date></item></rdf:RDF>`;
    const atom = `<feed><entry><title>UN vote</title><link rel="alternate" href="https://news.un.org/3"/><updated>2026-10-07T08:00:00Z</updated></entry></feed>`;
    expect(parseFeed(rss)[0]).toEqual({ title: "Ceasefire talks resume", url: "https://bbc.co.uk/1", publishedAt: "2026-10-07T10:00:00.000Z" });
    expect(parseFeed(rdf)[0].url).toBe("https://dw.com/2");
    expect(parseFeed(atom)[0].url).toBe("https://news.un.org/3");
  });

  it("reads GDELT dates", () => {
    expect(gdeltDate("20261007T121500Z")).toBe("2026-10-07T12:15:00Z");
  });
});

describe("classify and geotag", () => {
  it("assigns sections from headline words", () => {
    expect(classify("Missile strike hits Kharkiv as ceasefire talks stall")).toContain("conflict");
    expect(classify("Central bank holds interest rate as inflation cools")).toContain("economy");
    expect(classify("Something unrelated", "energy")).toEqual(["energy"]);
  });

  it("finds countries, preferring longer names and city positions", () => {
    expect(geotag("Fighting spreads in South Sudan").countries).toEqual(["SSD"]);
    expect(geotag("Indian and Pakistani officials meet").countries).toEqual(["IND", "PAK"]);
    const kyiv = geotag("Drone attack on Kyiv overnight");
    expect(kyiv.countries).toEqual(["UKR"]);
    expect(kyiv.lat).toBeCloseTo(50.45);
  });
});

describe("cluster", () => {
  it("merges the same event across outlets and applies the 2-source rule", () => {
    const out = clusterItems([
      item({ title: "Russian missile strike hits Kyiv power plant", countries: ["UKR", "RUS"], url: "https://bbc.co.uk/x" }),
      item({ name: "DW", domain: "dw.com", title: "Missile strike on Kyiv power plant, Ukraine says", countries: ["UKR"], url: "https://dw.com/y" }),
      item({ title: "Inflation falls in India", countries: ["IND"], url: "https://bbc.co.uk/z" }),
    ]);
    const kyiv = out.find((c) => c.countries.includes("UKR"))!;
    expect(out).toHaveLength(2);
    expect(kyiv.sourceCount).toBe(2);
    expect(kyiv.verified).toBe(true);
    expect(out.find((c) => c.countries.includes("IND"))!.verified).toBe(false);
  });

  it("leads with the country most headlines mention and places the story there", () => {
    const out = clusterItems([
      item({ title: "US military aid to Israel continues three years on", countries: ["USA", "ISR"], lat: 39, lng: -98, url: "https://bbc.co.uk/1" }),
      item({ name: "DW", domain: "dw.com", title: "Israel marks three years since October 7 attack", countries: ["ISR"], lat: 31, lng: 35, url: "https://dw.com/2" }),
      item({ name: "CNN", domain: "cnn.com", tier: 2, title: "Israel marks three years since attack", countries: ["ISR"], lat: 31, lng: 35, url: "https://cnn.com/3" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].countries).toEqual(["ISR", "USA"]);
    expect([out[0].lat, out[0].lng]).toEqual([31, 35]);
  });
});

describe("exclusions", () => {
  it("drops sport and reader call-outs", async () => {
    const { isExcluded } = await import("./classify");
    expect(isExcluded("Messi scores as Argentina beat Benin")).toBe(true);
    expect(isExcluded("Tell us: are you affected by the 6% mortgage rate?")).toBe(true);
    expect(isExcluded("Missile strike hits Kharkiv")).toBe(false);
  });
});
