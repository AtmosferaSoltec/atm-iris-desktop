/**
 * Contract §2: the form names are compared in. Trimmed, inner spaces collapsed,
 * diacritics removed (NFD without combining marks) and lowercased:
 * "  José   Pérez " → "jose perez".
 */
export function nameKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** "Daniel Ruiz" → "DR". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toLocaleUpperCase("es");
}

/** Initials for the account avatar: first letters of the first two words longer than 2 letters. */
export function accountInitials(churchName: string): string {
  const words = churchName.split(/\s+/).filter((word) => word.length > 2);
  return initials(words.join(" ") || churchName);
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}

/** "1 bloque" / "3 bloques". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "Sublime gracia.png" → "Sublime gracia". */
export function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
