// Lyrics found outside Iris (LRCLIB) as the editor writes them: stanzas become slides, one
// blank line between them, and `[Coro]`-style tags become `#Coro`.

/** More lines than this per slide are hard to read from the back of the room. */
const MAX_LINES = 6;

/** Plain lyrics (stanzas split by blank lines) in the editor's format. */
export function lyricsFromPlainText(text: string): string {
  const stanzas = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((stanza) =>
      stanza
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0);

  return stanzas
    .flatMap((lines) => {
      const tag = lines[0]?.match(/^\[(.+)\]$/)?.[1]?.trim();
      const body = tag ? lines.slice(1) : lines;
      if (body.length === 0) return [];
      const [first, ...rest] = split(body);
      return [tag ? [`#${tag.slice(0, 40)}`, ...first!] : first!, ...rest];
    })
    .map((lines) => lines.join("\n"))
    .join("\n\n");
}

/** A long stanza in even slides of at most `MAX_LINES` (7 → 4 + 3, 12 → 4 + 4 + 4). */
function split(lines: string[]): string[][] {
  if (lines.length <= MAX_LINES) return [lines];
  const count = Math.ceil(lines.length / 4);
  const size = Math.ceil(lines.length / count);
  return Array.from({ length: Math.ceil(lines.length / size) }, (_, index) =>
    lines.slice(index * size, index * size + size),
  );
}
