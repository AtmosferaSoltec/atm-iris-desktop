// Plain-text lyrics ⇄ song sections.
//
// Format (what people type in the editor):
//   - A blank line starts a new section (one section = one screen on the TV).
//   - A section may start with its name on a line that begins with "#":
//     "#Coro", "# Estrofa 2", "#Cualquier texto". The name is free text, optional,
//     and that line is not projected.

export type ParsedSection = { label: string | null; text: string };

export const LYRICS_LIMITS = {
  maxSections: 80,
  maxLinesPerSection: 12,
  maxLabelLength: 40,
} as const;

/** The text after "#", or null when the line is not a label. */
function labelFrom(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("#")) return null;
  return trimmed.replace(/^#+/, "").trim() || null;
}

export function parseLyrics(raw: string): ParsedSection[] {
  const blocks = raw
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0);

  const sections: ParsedSection[] = [];
  let pendingLabel: string | null = null;

  for (const lines of blocks) {
    const isLabelled = lines[0].startsWith("#");
    const label = isLabelled ? labelFrom(lines[0]) : null;
    const body = isLabelled ? lines.slice(1) : lines;
    if (body.length === 0) {
      // A label on its own ("#Coro" + blank line) names the next block.
      pendingLabel = label;
      continue;
    }
    sections.push({ label: label ?? pendingLabel, text: body.join("\n") });
    pendingLabel = null;
  }
  return sections;
}

/** Inverse of `parseLyrics`, used to edit an existing song as plain text. */
export function formatLyrics(sections: { label: string | null; text: string }[]): string {
  return sections
    .map((section) => (section.label ? `#${section.label}\n${section.text}` : section.text))
    .join("\n\n");
}

export function firstLine(sections: { text: string }[]): string | null {
  return sections[0]?.text.split("\n")[0] ?? null;
}
