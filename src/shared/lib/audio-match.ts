// Pairs songs that have no track with MP3 files by name. Pure: main feeds it, the operator confirms.
//
// Strongest first: "title + author" (either order), the exact title, then the title contained in
// the file name (or the reverse). A pair is accepted only when it is the one candidate on both
// sides, so a doubtful file is left for the operator instead of going to the wrong song.

import { nameKey } from "./text";

export type MatchSong = { id: string; title: string; author: string };
export type MatchFile = { id: string; fileName: string };
/** `isSure` is false for loose matches ("Océanos" ↔ "Océanos Hillsong"): the operator reviews them. */
export type AudioMatch = { songId: string; fileId: string; isSure: boolean };

/** Lowercase words only: "01 - Hosanna (Official Audio).mp3" → "hosanna". */
function wordsOf(value: string): string {
  return nameKey(value)
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[([{][^)\]}]*[)\]}]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function stemKey(fileName: string): string {
  return wordsOf(fileName)
    .replace(/^\d+\s+/, "")
    .trim();
}

function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

function score(song: MatchSong, file: string): number {
  const title = wordsOf(song.title);
  if (!title || !file) return 0;
  const author = wordsOf(song.author);
  if (author && (file === `${title} ${author}` || file === `${author} ${title}`)) return 3;
  if (file === title) return 2;
  // Short titles ("Gracias") would match too much inside a longer name.
  const isDistinct = (value: string): boolean => value.length >= 8 && value.includes(" ");
  if (isDistinct(title) && containsWords(file, title)) return 1;
  if (isDistinct(file) && containsWords(title, file)) return 1;
  // Loose: one name begins or ends with the other ("oceanos" / "oceanos hillsong").
  const edge = (long: string, short: string): boolean =>
    short.length >= 4 && (long.startsWith(`${short} `) || long.endsWith(` ${short}`));
  if (edge(file, title) || edge(title, file)) return 0.5;
  return 0;
}

export function matchAudios(songs: MatchSong[], files: MatchFile[]): AudioMatch[] {
  const keys = new Map(files.map((file) => [file.id, stemKey(file.fileName)]));
  const pairs = songs.flatMap((song) =>
    files
      .map((file) => ({ song: song.id, file: file.id, level: score(song, keys.get(file.id)!) }))
      .filter((pair) => pair.level > 0),
  );
  const usedSongs = new Set<string>();
  const usedFiles = new Set<string>();
  const matches: AudioMatch[] = [];
  for (const level of [3, 2, 1, 0.5]) {
    const open = pairs.filter(
      (pair) => pair.level === level && !usedSongs.has(pair.song) && !usedFiles.has(pair.file),
    );
    const perSong = new Map<string, number>();
    const perFile = new Map<string, number>();
    for (const pair of open) {
      perSong.set(pair.song, (perSong.get(pair.song) ?? 0) + 1);
      perFile.set(pair.file, (perFile.get(pair.file) ?? 0) + 1);
    }
    for (const pair of open) {
      if (perSong.get(pair.song) !== 1 || perFile.get(pair.file) !== 1) continue;
      usedSongs.add(pair.song);
      usedFiles.add(pair.file);
      matches.push({ songId: pair.song, fileId: pair.file, isSure: level >= 1 });
    }
  }
  return matches;
}
