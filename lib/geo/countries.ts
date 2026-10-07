// Country geometry built by scripts/build-geometry.mjs (Natural Earth admin-0, 1:50m).
import { pointInRing } from "./sphere";

export type Ring = [number, number][]; // [lng, lat]
export type CountryRecord = {
  iso3: string;
  name: string;
  centroid: [lat: number, lng: number];
  area: number;
  polygons: Ring[][]; // each polygon: [outer, ...holes]
};

type IndexedRing = { pts: Ring; wrap: boolean; minX: number; minY: number; maxX: number; maxY: number };
export type IndexedCountry = CountryRecord & { outer: IndexedRing[] };

/** Rings that cross the antimeridian are shifted to 0..360 so bbox and point tests stay valid. */
function indexRing(ring: Ring): IndexedRing {
  let minX = 999, maxX = -999;
  for (const [x] of ring) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  const wrap = maxX - minX > 180;
  const pts: Ring = wrap ? ring.map(([x, y]) => [x < 0 ? x + 360 : x, y]) : ring;
  let minY = 999, maxY = -999;
  minX = 999;
  maxX = -999;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { pts, wrap, minX, minY, maxX, maxY };
}

export function indexCountries(list: CountryRecord[]): IndexedCountry[] {
  return list.map((c) => ({ ...c, outer: c.polygons.map((poly) => indexRing(poly[0])) }));
}

export function countryAt(list: IndexedCountry[], lat: number, lng: number): IndexedCountry | null {
  for (const c of list) {
    for (const r of c.outer) {
      const x = r.wrap && lng < 0 ? lng + 360 : lng;
      if (x < r.minX || x > r.maxX || lat < r.minY || lat > r.maxY) continue;
      if (pointInRing(x, lat, r.pts)) return c;
    }
  }
  return null;
}

let cache: Promise<IndexedCountry[]> | null = null;

export function loadCountries(): Promise<IndexedCountry[]> {
  cache ??= fetch("/geo/countries.json")
    .then((r) => {
      if (!r.ok) throw new Error(`countries.json: ${r.status}`);
      return r.json() as Promise<CountryRecord[]>;
    })
    .then(indexCountries);
  return cache;
}

/** Interior state borders only (coasts and country borders come from admin-0), plus label anchors. */
export type Admin1File = { iso3: string; states: { name: string; label: [number, number] }[]; lines: Ring[] };

const adm1Cache = new Map<string, Promise<Admin1File | null>>();

export function loadAdmin1(iso3: string): Promise<Admin1File | null> {
  let p = adm1Cache.get(iso3);
  if (!p) {
    p = fetch(`/geo/adm1/${iso3}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Admin1File>) : null))
      .catch(() => null);
    adm1Cache.set(iso3, p);
  }
  return p;
}
