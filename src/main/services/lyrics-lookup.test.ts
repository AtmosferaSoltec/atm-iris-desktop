import { afterEach, expect, it, vi } from "vitest";
import { searchLyrics } from "./lyrics-lookup";

afterEach(() => vi.unstubAllGlobals());
it("deduplicates lyrics, removes instrumental results and keeps the Spanish display model", async () => {
  const song = {
    id: 1,
    trackName: "Sublime gracia",
    artistName: "John Newton",
    albumName: null,
    instrumental: false,
    plainLyrics: "Sublime gracia del Señor",
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify([song, { ...song, id: 2 }, { ...song, id: 3, instrumental: true }]),
        ),
      ),
  );
  expect(await searchLyrics("Sublime gracia", "")).toEqual({
    results: [
      {
        id: 1,
        title: "Sublime gracia",
        artist: "John Newton",
        album: null,
        lyrics: "Sublime gracia del Señor",
      },
    ],
  });
});
it("reports unavailable lookup without changing or fabricating lyrics", async () => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));
  expect(await searchLyrics("Sublime gracia", "")).toEqual({
    error: "No pudimos consultar las letras ahora. Inténtalo en un momento.",
  });
});
