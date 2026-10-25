import { expect, it } from "vitest";
import { TOOLS } from "./tools-button";
it("declares exactly one opening mode for each registered tool", () => {
  expect(TOOLS.map((tool) => tool.id)).toEqual(["text", "timer", "sounds"]);
  for (const tool of TOOLS)
    expect(Number(Boolean(tool.panel)) + Number(Boolean(tool.dialog))).toBe(1);
});
