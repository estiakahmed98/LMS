import { describe, expect, it } from "vitest";
import {
  createCqPart,
  decodeCqParts,
  encodeCqParts,
  getCqPartLabel,
} from "./question-bank-cq";

describe("flexible CQ parts", () => {
  it("uses no implicit parts for passage-only questions", () => {
    expect(decodeCqParts([])).toEqual([]);
  });

  it("round-trips a variable number of parts", () => {
    const parts = [createCqPart(0, "en"), createCqPart(1, "en")];
    parts[0].text = "First";
    parts[1].text = "Second";
    expect(decodeCqParts(encodeCqParts(parts))).toEqual(parts);
  });

  it("derives display labels from locale and index", () => {
    expect([0, 1, 2, 3].map((index) => getCqPartLabel(index, "bn"))).toEqual([
      "ক",
      "খ",
      "গ",
      "ঘ",
    ]);
    expect([0, 1, 2].map((index) => getCqPartLabel(index, "en"))).toEqual([
      "A",
      "B",
      "C",
    ]);
  });
});
