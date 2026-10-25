import { describe, expect, it } from "vitest";
import { periodFromParams } from "./period";

describe("periodFromParams", () => {
  it("accepts a calendar month and rejects malformed or out of range months", () => {
    expect(periodFromParams("month", "2026-09")).toEqual({ kind: "month", year: 2026, month: 9 });
    for (const value of ["", "2026-00", "2026-13", "2026-9", "bad"])
      expect(periodFromParams("month", value)).toEqual({ kind: "last3Months" });
    expect(periodFromParams("thisYear", "bad")).toEqual({ kind: "thisYear" });
  });
});
