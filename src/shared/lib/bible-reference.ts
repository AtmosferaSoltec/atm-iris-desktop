import { BIBLE_BOOK_BY_ID, BIBLE_BOOKS, type BibleBookInfo } from "@shared/domain/bible-books";
import { nameKey } from "./text";

// "Juan 3:16", "1 Co 13:4-7", "sal 23", "Génesis 1": what a person types, as a book,
// a chapter and verses. And the plan's passage id (contract §15) both ways.

export type BibleReference = {
  book: BibleBookInfo;
  chapter: number | null;
  from: number | null;
  to: number | null;
};

/** Short forms people use that a plain prefix would get wrong or miss. */
const ALIASES: Record<string, string> = {
  gn: "GEN",
  ex: "EXO",
  lv: "LEV",
  nm: "NUM",
  dt: "DEU",
  jos: "JOS",
  jue: "JDG",
  rt: "RUT",
  sal: "PSA",
  salmo: "PSA",
  sl: "PSA",
  pr: "PRO",
  prov: "PRO",
  ec: "ECC",
  cnt: "SNG",
  cant: "SNG",
  is: "ISA",
  jer: "JER",
  lm: "LAM",
  ez: "EZK",
  dn: "DAN",
  os: "HOS",
  jl: "JOL",
  am: "AMO",
  abd: "OBA",
  jon: "JON",
  mi: "MIC",
  nah: "NAM",
  hab: "HAB",
  sof: "ZEP",
  hag: "HAG",
  zac: "ZEC",
  mal: "MAL",
  mt: "MAT",
  mr: "MRK",
  mc: "MRK",
  lc: "LUK",
  jn: "JHN",
  hch: "ACT",
  hech: "ACT",
  ro: "ROM",
  rom: "ROM",
  gal: "GAL",
  ga: "GAL",
  ef: "EPH",
  fil: "PHP",
  flp: "PHP",
  col: "COL",
  tit: "TIT",
  flm: "PHM",
  heb: "HEB",
  stg: "JAS",
  sant: "JAS",
  jud: "JUD",
  ap: "REV",
  apoc: "REV",
};

const KEYED = BIBLE_BOOKS.map((book) => ({ book, key: nameKey(book.name).replace(/\s+/g, "") }));

/** The book a person means by `text` ("1 juan", "jn", "salmo"), or null. */
export function findBook(text: string): BibleBookInfo | null {
  const key = nameKey(text).replace(/\s+/g, "");
  if (!key) return null;
  const numbered = /^([123])(.*)$/.exec(key);
  const alias = numbered ? ALIASES[numbered[2]!] : ALIASES[key];
  if (alias) {
    const id = numbered ? `${numbered[1]}${alias.slice(1)}` : alias;
    const book = BIBLE_BOOK_BY_ID.get(id) ?? (numbered ? null : BIBLE_BOOK_BY_ID.get(alias));
    if (book) return book;
  }
  return (
    KEYED.find((entry) => entry.key === key)?.book ??
    (key.length >= 2 && KEYED.filter((entry) => entry.key.startsWith(key)).length === 1
      ? KEYED.find((entry) => entry.key.startsWith(key))?.book
      : undefined) ??
    null
  );
}

const PATTERN =
  /^\s*((?:[123]\s*)?[^\d:.]+?)\s*(?:(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?)?\s*$/;

/** What `input` refers to, or null when it is not a reference. */
export function parseReference(input: string): BibleReference | null {
  const match = PATTERN.exec(input);
  if (!match) return null;
  const book = findBook(match[1]!);
  if (!book) return null;
  const chapter = match[2] ? Number(match[2]) : null;
  if (chapter !== null && (chapter < 1 || chapter > book.chapterCount)) return null;
  const from = match[3] ? Number(match[3]) : null;
  const to = match[4] ? Number(match[4]) : from;
  if (from !== null && (from < 1 || to! < from)) return null;
  return { book, chapter, from, to };
}

/** A passage of the plan (contract §15): `rvr1960:JHN.3.16-18`. */
export type Passage = { code: string; bookId: string; chapter: number; from: number; to: number };

export function passageId({ code, bookId, chapter, from, to }: Passage): string {
  return `${code}:${bookId}.${chapter}.${from}${to > from ? `-${to}` : ""}`;
}

export function parsePassageId(id: string): Passage | null {
  const match = /^([a-z0-9]{2,20}):([A-Z0-9]{3})\.(\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/.exec(id);
  if (!match) return null;
  const [, code, bookId, chapter, from, to = from] = match;
  if (Number(to) < Number(from)) return null;
  return {
    code: code!,
    bookId: bookId!,
    chapter: Number(chapter),
    from: Number(from),
    to: Number(to),
  };
}

/** "Juan 3:16", "Juan 3:16-18". */
export function passageLabel({ bookId, chapter, from, to }: Omit<Passage, "code">): string {
  const name = BIBLE_BOOK_BY_ID.get(bookId)?.name ?? bookId;
  return `${name} ${chapter}:${from}${to > from ? `-${to}` : ""}`;
}

/** Complete only name prefixes; aliases such as `jn` stay usable before a chapter number. */
export function completeBookName(input: string): { text: string; selectionStart: number } | null {
  if (!input || input !== input.trim() || /\d/.test(input.replace(/^[123]\s*/, ""))) return null;
  const book = findBook(input);
  if (!book) return null;
  const key = nameKey(input).replace(/\s+/g, "");
  const fullKey = nameKey(book.name).replace(/\s+/g, "");
  if (!fullKey.startsWith(key) || fullKey === key) return null;
  let count = 0;
  let selectionStart = 0;
  for (const character of book.name) {
    selectionStart += character.length;
    if (/\S/.test(character)) count++;
    if (count === key.length) break;
  }
  return { text: book.name, selectionStart };
}
