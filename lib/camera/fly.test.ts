import { describe, expect, it } from "vitest";
import { clampCamera, planFly, sampleFly, tiltFor } from "./fly";

describe("camera fly-to", () => {
  it("starts and ends exactly at the endpoints", () => {
    const plan = planFly({ lat: 25, lng: 70, dist: 3 }, { lat: 48, lng: 37, dist: 1.75 });
    expect(sampleFly(plan, 0)).toEqual({ lat: 25, lng: 70, dist: 3 });
    const end = sampleFly(plan, 1);
    expect(end.lat).toBeCloseTo(48);
    expect(end.lng).toBeCloseTo(37);
    expect(end.dist).toBeCloseTo(1.75);
  });

  it("rises above the straight path at the midpoint", () => {
    const plan = planFly({ lat: 0, lng: 0, dist: 3 }, { lat: 0, lng: 120, dist: 3 });
    expect(sampleFly(plan, 0.5).dist).toBeGreaterThan(3);
  });

  it("crosses the antimeridian the short way", () => {
    const plan = planFly({ lat: 0, lng: 170, dist: 3 }, { lat: 0, lng: -170, dist: 3 });
    expect(plan.to.lng).toBe(190);
  });

  it("tilts only when close to the surface", () => {
    expect(tiltFor(3)).toBe(0);
    expect(tiltFor(1.2)).toBeGreaterThan(0.8);
  });

  it("clamps distance and latitude", () => {
    expect(clampCamera({ lat: 95, lng: 0, dist: 0.5 })).toEqual({ lat: 80, lng: 0, dist: 1.11 });
  });
});
