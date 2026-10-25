import { describe, expect, it } from "vitest";
import { firstLine, formatLyrics, parseLyrics } from "./lyrics";

describe("parseLyrics", () => {
  it("splits sections on blank lines and trims lines", () => {
    const sections = parseLyrics("  Línea uno \nLínea dos\n\n\n  Línea tres  \r\n");
    expect(sections).toEqual([
      { label: null, text: "Línea uno\nLínea dos" },
      { label: null, text: "Línea tres" },
    ]);
  });

  it("reads a label from a first line that starts with #", () => {
    const sections = parseLyrics("#Estrofa 1\nA\n\n# Coro\nB\n\n#Lo que quieras\nC\n\nD");
    expect(sections.map((s) => s.label)).toEqual(["Estrofa 1", "Coro", "Lo que quieras", null]);
    expect(sections.map((s) => s.text)).toEqual(["A", "B", "C", "D"]);
  });

  it("only the third and fifth slides of ten lines carry a label", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `L${i + 1}`);
    const raw = [
      lines.slice(0, 2).join("\n"),
      lines.slice(2, 4).join("\n"),
      `#Verso\n${lines.slice(4, 6).join("\n")}`,
      lines.slice(6, 8).join("\n"),
      `#Coro\n${lines.slice(8).join("\n")}`,
    ].join("\n\n");
    expect(parseLyrics(raw).map((s) => s.label)).toEqual([null, null, "Verso", null, "Coro"]);
  });

  it("does not treat the old [Coro] or Coro: forms as labels", () => {
    const sections = parseLyrics("[Coro]\nA\n\nCoro:\nB");
    expect(sections.map((s) => s.label)).toEqual([null, null]);
    expect(sections[0].text).toBe("[Coro]\nA");
  });

  it("applies a lone label to the next section", () => {
    expect(parseLyrics("#Coro\n\nSanto es el Señor")).toEqual([
      { label: "Coro", text: "Santo es el Señor" },
    ]);
  });

  it("ignores a # with no name", () => {
    expect(parseLyrics("#\nA")).toEqual([{ label: null, text: "A" }]);
  });

  it("handles Windows line endings and blank lines with spaces", () => {
    expect(parseLyrics("#Coro\r\nSanto, santo\r\n   \r\nDigno es el Cordero\r\n")).toEqual([
      { label: "Coro", text: "Santo, santo" },
      { label: null, text: "Digno es el Cordero" },
    ]);
  });

  it("returns nothing for blank input or a label alone", () => {
    expect(parseLyrics(" \n\n ")).toEqual([]);
    expect(parseLyrics("#Coro\n\n")).toEqual([]);
  });
});

describe("formatLyrics", () => {
  it("round-trips with parseLyrics", () => {
    const sections = [
      { label: "Estrofa 1", text: "Sublime gracia del Señor\nque a un pecador salvó" },
      { label: null, text: "Sin nombre" },
    ];
    expect(parseLyrics(formatLyrics(sections))).toEqual(sections);
  });
});

describe("firstLine", () => {
  it("returns the first projected line", () => {
    expect(firstLine([{ text: "Uno\nDos" }])).toBe("Uno");
    expect(firstLine([])).toBeNull();
  });
});
