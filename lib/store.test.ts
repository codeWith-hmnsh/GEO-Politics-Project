import { beforeEach, describe, expect, it } from "vitest";
import { useGlobe } from "./store";

describe("compare selection", () => {
  beforeEach(() => useGlobe.getState().closePanel());

  it("fills the second slot while picking, then a new tap starts over", () => {
    const s = () => useGlobe.getState();
    s().select("IND");
    s().startCompare();
    s().select("PAK");
    expect([s().selectedIso3, s().compareIso3, s().comparePicking]).toEqual(["IND", "PAK", false]);
    s().select("CHN");
    expect([s().selectedIso3, s().compareIso3]).toEqual(["CHN", null]);
  });

  it("ignores a tap on the same country while picking", () => {
    const s = () => useGlobe.getState();
    s().select("IND");
    s().startCompare();
    s().select("IND");
    expect([s().selectedIso3, s().compareIso3]).toEqual(["IND", null]);
  });
});
