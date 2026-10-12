// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare, type Share } from "./share";

const s: Share = { v: 1, c: "IND", l: "Asha Rao", p: 2, y0: 2026, y1: 2037, r0: 3, r1: 2, s: 702, w: true, g: 2, a: "Led South Asia — and won.", sc: "energyShock" };

describe("share links", () => {
  it("round-trips a result, including non-ASCII text", () => {
    expect(decodeShare(encodeShare(s))).toEqual(s);
  });
  it("rejects broken or out-of-range codes", () => {
    expect(decodeShare("not-a-code")).toBeNull();
    expect(decodeShare(encodeShare({ ...s, s: 5000 } as Share))).toBeNull();
    expect(decodeShare(encodeShare({ ...s, c: "FRA" } as unknown as Share))).toBeNull();
  });
});
