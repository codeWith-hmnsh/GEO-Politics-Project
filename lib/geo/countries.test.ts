import { describe, expect, it } from "vitest";
import { countryAt, indexCountries, type CountryRecord } from "./countries";

const square = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
  [x0, y0],
];

const list: CountryRecord[] = [
  { iso3: "AAA", name: "A", centroid: [5, 5], area: 100, polygons: [[square(0, 0, 10, 10)]] },
  // Straddles the antimeridian, like Fiji or Chukotka.
  { iso3: "WRP", name: "Wrap", centroid: [0, 180], area: 4, polygons: [[square(178, -1, -178, 1)]] },
];

describe("countryAt", () => {
  const idx = indexCountries(list);

  it("finds the country under a point", () => {
    expect(countryAt(idx, 5, 5)?.iso3).toBe("AAA");
    expect(countryAt(idx, 20, 20)).toBeNull();
  });

  it("handles rings across the antimeridian", () => {
    expect(countryAt(idx, 0, 179)?.iso3).toBe("WRP");
    expect(countryAt(idx, 0, -179)?.iso3).toBe("WRP");
    expect(countryAt(idx, 0, 170)).toBeNull();
  });
});
