import { describe, expect, it } from "vitest";
import { lyricsFromPlainText } from "./lyrics-import";

describe("lyricsFromPlainText", () => {
  it("keeps stanzas as slides and tidies the spacing", () => {
    expect(lyricsFromPlainText("  Uno\r\nDos  \n\n\n\nTres\n \nCuatro\n")).toBe(
      "Uno\nDos\n\nTres\n\nCuatro",
    );
  });

  it("turns [Coro] tags into #Coro", () => {
    expect(lyricsFromPlainText("[Coro]\nEn Jesús fuerte soy\n\n[Puente]")).toBe(
      "#Coro\nEn Jesús fuerte soy",
    );
  });

  it("splits a long stanza into even slides", () => {
    const seven = ["1", "2", "3", "4", "5", "6", "7"].join("\n");
    expect(lyricsFromPlainText(seven)).toBe("1\n2\n3\n4\n\n5\n6\n7");
    const six = ["1", "2", "3", "4", "5", "6"].join("\n");
    expect(lyricsFromPlainText(six)).toBe(six);
  });
});
