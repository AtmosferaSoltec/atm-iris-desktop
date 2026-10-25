// Lyrics from LRCLIB (lrclib.net): a free, open lyrics database with no key or sign-up. It
// asks clients to name themselves in the User-Agent. Results are cached for a day.

import { z } from "@shared/zod";
import type { FoundLyrics } from "@shared/domain/lyrics";

const USER_AGENT = "Iris (proyección para iglesias)";

/**
 * Songs called `title`, by `artist` when given. A search by title and artist is light for
 * LRCLIB; if it is busy anyway, it is tried once more by title only.
 */
export async function searchLyrics(
  title: string,
  artist: string,
): Promise<{ results?: FoundLyrics[]; error?: string }> {
  const first = await search(artist ? { track_name: title, artist_name: artist } : { q: title });
  const response = first ?? (artist ? await search({ track_name: title }) : null);
  if (!response) {
    return { error: "No pudimos consultar las letras ahora. Inténtalo en un momento." };
  }
  const seen = new Set<string>();
  const results = response
    .filter((song) => !song.instrumental && song.plainLyrics?.trim())
    .filter((song) => {
      // The same lyrics come once per album: one is enough.
      const key = `${song.artistName.toLowerCase()}|${song.plainLyrics!.slice(0, 200)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((song) => ({
      id: song.id,
      title: song.trackName,
      artist: song.artistName,
      album: song.albumName || null,
      lyrics: song.plainLyrics!,
    }));
  return { results };
}

type LrclibSong = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  instrumental: boolean;
  plainLyrics: string | null;
};

/** One search; null when LRCLIB is busy or unreachable. */
async function search(params: Record<string, string>): Promise<LrclibSong[] | null> {
  try {
    const response = await fetch(`https://lrclib.net/api/search?${new URLSearchParams(params)}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return z
      .array(
        z.object({
          id: z.number(),
          trackName: z.string(),
          artistName: z.string(),
          albumName: z.string().nullable(),
          instrumental: z.boolean(),
          plainLyrics: z.string().nullable(),
        }),
      )
      .parse(await response.json());
  } catch {
    return null;
  }
}
