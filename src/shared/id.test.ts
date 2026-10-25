import { describe, expect, it } from "vitest";
import { validate, version } from "uuid";
import { createId } from "./id";

describe("createId", () => {
  it("creates unique, chronologically ordered UUID v7 identifiers", () => {
    const ids = Array.from({ length: 1000 }, createId);
    expect(ids.every((id) => validate(id) && version(id) === 7)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });
});
