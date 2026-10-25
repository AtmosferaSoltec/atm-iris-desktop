import { describe, expect, it } from "vitest";
import { pageParser, searchParser, kindParser, timeSearchParams } from "./search-params";

describe("search parameter parsers", () => {
  it("rejects invalid pagination, fractions and unsafe numbers", () => {
    for (const value of [null, "", "-1", "0", "1.2", "2abc", "Infinity", "9007199254740992"])
      expect(pageParser.parse(value)).toBe(1);
    expect(pageParser.parse("12")).toBe(12);
    expect(pageParser.serialize(1)).toBeNull();
    expect(pageParser.serialize(12)).toBe("12");
  });
  it("keeps Spanish search text and removes default values", () => {
    expect(searchParser.parse("Sublime gracia áéí")).toBe("Sublime gracia áéí");
    expect(searchParser.parse(null)).toBe("");
    expect(searchParser.serialize("")).toBeNull();
  });
  it("accepts only known filter values", () => {
    expect(kindParser.parse("video")).toBe("video");
    expect(kindParser.parse("script")).toBe("all");
    expect(timeSearchParams.tab.parse("summaries")).toBe("summaries");
    expect(timeSearchParams.period.parse("bad")).toBe("last3Months");
  });
});
