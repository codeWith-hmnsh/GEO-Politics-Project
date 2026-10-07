import { describe, expect, it } from "vitest";
import { latLngToVec3, lngDelta, pointInRing, slerp, vec3ToLatLng } from "./sphere";

describe("sphere maths", () => {
  it("round-trips lat/lng through a vector", () => {
    for (const [lat, lng] of [
      [0, 0],
      [22.5, 79],
      [-33.9, 151.2],
      [60, -100],
    ] as const) {
      const [la, ln] = vec3ToLatLng(latLngToVec3(lat, lng));
      expect(la).toBeCloseTo(lat, 6);
      expect(ln).toBeCloseTo(lng, 6);
    }
  });

  it("places the north pole on +Y", () => {
    const [x, y, z] = latLngToVec3(90, 0);
    expect(y).toBeCloseTo(1, 6);
    expect(Math.abs(x) + Math.abs(z)).toBeCloseTo(0, 6);
  });

  it("keeps slerp on the unit sphere", () => {
    const p = slerp(latLngToVec3(0, 0), latLngToVec3(0, 90), 0.5);
    expect(Math.hypot(...p)).toBeCloseTo(1, 6);
    expect(vec3ToLatLng(p)[1]).toBeCloseTo(45, 6);
  });

  it("takes the short way round the antimeridian", () => {
    expect(lngDelta(170, -170)).toBe(20);
    expect(lngDelta(-170, 170)).toBe(-20);
  });

  it("detects points inside a ring", () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(pointInRing(5, 5, square)).toBe(true);
    expect(pointInRing(15, 5, square)).toBe(false);
  });
});
