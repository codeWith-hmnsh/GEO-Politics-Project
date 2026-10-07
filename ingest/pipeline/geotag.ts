import aliasConfig from "@/config/country-aliases.json";
import places from "@/data/curated/places.json";

export type GeoCountry = { iso3: string; name: string; centroid: [number, number] };
export type GeoTag = { countries: string[]; lat: number | null; lng: number | null };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Build a headline → countries matcher from country names, aliases and city names. */
export function makeGeotagger(countries: GeoCountry[]) {
  const byIso = new Map(countries.map((c) => [c.iso3, c]));
  const terms = new Map<string, string>();
  for (const c of countries) terms.set(c.name.toLowerCase(), c.iso3);
  for (const [alias, iso3] of Object.entries(aliasConfig.aliases)) terms.set(alias.toLowerCase(), iso3);

  const cityPoint = new Map<string, [number, number]>();
  for (const [name, lat, lng] of places.cities as [string, number, number][]) cityPoint.set(name.toLowerCase(), [lat, lng]);

  // Longest terms first so "south sudan" wins over "sudan".
  const sorted = [...terms.keys()].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<![\\p{L}])(${sorted.map(escape).join("|")})(?![\\p{L}])`, "giu");
  const cityRe = new RegExp(`(?<![\\p{L}])(${[...cityPoint.keys()].map(escape).join("|")})(?![\\p{L}])`, "iu");

  return function geotag(title: string): GeoTag {
    const found: string[] = [];
    for (const m of title.matchAll(re)) {
      const iso3 = terms.get(m[1].toLowerCase());
      if (iso3 && byIso.has(iso3) && !found.includes(iso3)) found.push(iso3);
    }
    const city = cityRe.exec(title);
    if (city) {
      const [lat, lng] = cityPoint.get(city[1].toLowerCase())!;
      return { countries: found, lat, lng };
    }
    const first = found[0] ? byIso.get(found[0]) : undefined;
    return { countries: found, lat: first?.centroid[0] ?? null, lng: first?.centroid[1] ?? null };
  };
}
