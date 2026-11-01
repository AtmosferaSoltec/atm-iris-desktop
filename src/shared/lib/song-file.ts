// Song files → Iris songs. Pure: the file is read in main, parsed here. Accepts a Holyrics export
// (JSON or TXT) and Iris's own backup.
//
// JSON (preferred): an array of songs; `lyrics.paragraphs` are the slides and a paragraph's
// `text_with_comment` starts with "//LABEL" when Holyrics named it (CORO, PUENTE…).
// TXT: songs separated by a line of "=", each with "Título:" / "Artista:" and the lyrics, where
// a "//LABEL" line names the slide that follows.

import { LYRICS_LIMITS, parseLyrics, type ParsedSection } from "./lyrics";

export type ImportedSong = { title: string; author: string; sections: ParsedSection[] };

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

const SEPARATOR = /^\s*={10,}\s*$/m;

function cleanLines(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/** "//CORO X2" → "CORO X2"; null when the line is not a Holyrics label. */
function labelOf(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("//")) return null;
  const label = trimmed.replace(/^\/+/, "").trim().slice(0, LYRICS_LIMITS.maxLabelLength).trim();
  return label || null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fromJsonSong(raw: unknown): ImportedSong {
  const song = (raw ?? {}) as Record<string, unknown>;
  const lyrics = (song.lyrics ?? {}) as Record<string, unknown>;
  const sections: ParsedSection[] = [];
  const paragraphs = Array.isArray(lyrics.paragraphs) ? lyrics.paragraphs : [];
  for (const paragraph of paragraphs as Record<string, unknown>[]) {
    const body = cleanLines(text(paragraph.text));
    if (!body) continue;
    const commented = text(paragraph.text_with_comment);
    sections.push({ label: commented ? labelOf(commented.split("\n")[0]!) : null, text: body });
  }
  if (!sections.length) {
    const full = text(lyrics.full_text_with_comment) || text(lyrics.full_text);
    sections.push(...fromPlainText(full));
  }
  return {
    title: text(song.title),
    author: text(song.artist) || text(song.author),
    sections,
  };
}

function fromBackupSong(raw: unknown): ImportedSong {
  const song = (raw ?? {}) as Record<string, unknown>;
  const sections = Array.isArray(song.sections) ? (song.sections as Record<string, unknown>[]) : [];
  return {
    title: text(song.title),
    author: text(song.author),
    sections: sections
      .map((section) => ({
        label: text(section.label) || null,
        text: cleanLines(text(section.text)),
      }))
      .filter((section) => section.text),
  };
}

/** Plain lyrics where "//LABEL" lines name the block that follows (they become Iris "#LABEL"). */
function fromPlainText(raw: string): ParsedSection[] {
  const withLabels = raw.replace(/^[ \t]*\/\/+[ \t]*(.*)$/gm, (_all, label: string) =>
    label.trim() ? `#${label.trim().slice(0, LYRICS_LIMITS.maxLabelLength)}` : "",
  );
  return parseLyrics(withLabels);
}

function fromTxtBlock(block: string): ImportedSong | null {
  const lines = stripBom(block).replace(/\r\n?/g, "\n").split("\n");
  let title = "";
  let author = "";
  let start = 0;
  for (; start < lines.length; start++) {
    const line = lines[start]!.trim();
    const header = /^(t[ií]tulo|titulo|artista|autor)\s*:\s*(.*)$/i.exec(line);
    if (header) {
      if (/^t/i.test(header[1]!)) title = header[2]!.trim();
      else author ||= header[2]!.trim();
    } else if (line) break;
  }
  if (!title && start >= lines.length) return null;
  return { title, author, sections: fromPlainText(lines.slice(start).join("\n")) };
}

/** Parses a Holyrics export (JSON or TXT). Throws when it is neither. */
export function parseSongFile(raw: string): ImportedSong[] {
  const source = stripBom(raw).trim();
  if (source.startsWith("[") || source.startsWith("{")) {
    const data: unknown = JSON.parse(source);
    const backup = data as { format?: unknown; songs?: unknown };
    if (backup.format === "iris-backup" && Array.isArray(backup.songs))
      return backup.songs.map(fromBackupSong);
    const list = Array.isArray(data) ? data : [data];
    if (!list.every((entry) => typeof entry === "object" && entry !== null))
      throw new Error("Not a song file");
    return list.map(fromJsonSong);
  }
  if (!/^\s*t[ií]tulo\s*:/im.test(source)) throw new Error("Not a song file");
  return source
    .split(SEPARATOR)
    .map(fromTxtBlock)
    .filter((song): song is ImportedSong => song !== null);
}
