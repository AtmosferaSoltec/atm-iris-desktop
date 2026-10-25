import { expect, it } from "vitest";
import { PROJECTION_FONT_KEYS } from "./projection-fonts";
import { fontStack } from "./projection-font-stack";

it("maps every font key to its bundled font and falls back safely", () => {
  expect(new Set(PROJECTION_FONT_KEYS).size).toBe(9);
  for (const key of PROJECTION_FONT_KEYS) {
    expect(fontStack(key)).toBeTruthy();
    if (key !== "system") expect(fontStack(key)).toContain("var(--font-projection-");
  }
  expect(fontStack("unknown")).toBe(fontStack("system"));
});
