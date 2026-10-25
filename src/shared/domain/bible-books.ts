// The 66 books of the Bible (contract §13), in canonical order: USFM id, Spanish name in Spanish, testament and chapters. Fixed: the console parses "Juan 3:16" and
// lists the books without asking the API.

export type BibleBookInfo = {
  id: string;
  name: string;
  testament: "old" | "new";
  chapterCount: number;
};

export const BIBLE_BOOKS: readonly BibleBookInfo[] = [
  { id: "GEN", name: "Génesis", testament: "old", chapterCount: 50 },
  { id: "EXO", name: "Éxodo", testament: "old", chapterCount: 40 },
  { id: "LEV", name: "Levítico", testament: "old", chapterCount: 27 },
  { id: "NUM", name: "Números", testament: "old", chapterCount: 36 },
  { id: "DEU", name: "Deuteronomio", testament: "old", chapterCount: 34 },
  { id: "JOS", name: "Josué", testament: "old", chapterCount: 24 },
  { id: "JDG", name: "Jueces", testament: "old", chapterCount: 21 },
  { id: "RUT", name: "Rut", testament: "old", chapterCount: 4 },
  { id: "1SA", name: "1 Samuel", testament: "old", chapterCount: 31 },
  { id: "2SA", name: "2 Samuel", testament: "old", chapterCount: 24 },
  { id: "1KI", name: "1 Reyes", testament: "old", chapterCount: 22 },
  { id: "2KI", name: "2 Reyes", testament: "old", chapterCount: 25 },
  { id: "1CH", name: "1 Crónicas", testament: "old", chapterCount: 29 },
  { id: "2CH", name: "2 Crónicas", testament: "old", chapterCount: 36 },
  { id: "EZR", name: "Esdras", testament: "old", chapterCount: 10 },
  { id: "NEH", name: "Nehemías", testament: "old", chapterCount: 13 },
  { id: "EST", name: "Ester", testament: "old", chapterCount: 10 },
  { id: "JOB", name: "Job", testament: "old", chapterCount: 42 },
  { id: "PSA", name: "Salmos", testament: "old", chapterCount: 150 },
  { id: "PRO", name: "Proverbios", testament: "old", chapterCount: 31 },
  { id: "ECC", name: "Eclesiastés", testament: "old", chapterCount: 12 },
  { id: "SNG", name: "Cantares", testament: "old", chapterCount: 8 },
  { id: "ISA", name: "Isaías", testament: "old", chapterCount: 66 },
  { id: "JER", name: "Jeremías", testament: "old", chapterCount: 52 },
  { id: "LAM", name: "Lamentaciones", testament: "old", chapterCount: 5 },
  { id: "EZK", name: "Ezequiel", testament: "old", chapterCount: 48 },
  { id: "DAN", name: "Daniel", testament: "old", chapterCount: 12 },
  { id: "HOS", name: "Oseas", testament: "old", chapterCount: 14 },
  { id: "JOL", name: "Joel", testament: "old", chapterCount: 3 },
  { id: "AMO", name: "Amós", testament: "old", chapterCount: 9 },
  { id: "OBA", name: "Abdías", testament: "old", chapterCount: 1 },
  { id: "JON", name: "Jonás", testament: "old", chapterCount: 4 },
  { id: "MIC", name: "Miqueas", testament: "old", chapterCount: 7 },
  { id: "NAM", name: "Nahúm", testament: "old", chapterCount: 3 },
  { id: "HAB", name: "Habacuc", testament: "old", chapterCount: 3 },
  { id: "ZEP", name: "Sofonías", testament: "old", chapterCount: 3 },
  { id: "HAG", name: "Hageo", testament: "old", chapterCount: 2 },
  { id: "ZEC", name: "Zacarías", testament: "old", chapterCount: 14 },
  { id: "MAL", name: "Malaquías", testament: "old", chapterCount: 4 },
  { id: "MAT", name: "Mateo", testament: "new", chapterCount: 28 },
  { id: "MRK", name: "Marcos", testament: "new", chapterCount: 16 },
  { id: "LUK", name: "Lucas", testament: "new", chapterCount: 24 },
  { id: "JHN", name: "Juan", testament: "new", chapterCount: 21 },
  { id: "ACT", name: "Hechos", testament: "new", chapterCount: 28 },
  { id: "ROM", name: "Romanos", testament: "new", chapterCount: 16 },
  { id: "1CO", name: "1 Corintios", testament: "new", chapterCount: 16 },
  { id: "2CO", name: "2 Corintios", testament: "new", chapterCount: 13 },
  { id: "GAL", name: "Gálatas", testament: "new", chapterCount: 6 },
  { id: "EPH", name: "Efesios", testament: "new", chapterCount: 6 },
  { id: "PHP", name: "Filipenses", testament: "new", chapterCount: 4 },
  { id: "COL", name: "Colosenses", testament: "new", chapterCount: 4 },
  { id: "1TH", name: "1 Tesalonicenses", testament: "new", chapterCount: 5 },
  { id: "2TH", name: "2 Tesalonicenses", testament: "new", chapterCount: 3 },
  { id: "1TI", name: "1 Timoteo", testament: "new", chapterCount: 6 },
  { id: "2TI", name: "2 Timoteo", testament: "new", chapterCount: 4 },
  { id: "TIT", name: "Tito", testament: "new", chapterCount: 3 },
  { id: "PHM", name: "Filemón", testament: "new", chapterCount: 1 },
  { id: "HEB", name: "Hebreos", testament: "new", chapterCount: 13 },
  { id: "JAS", name: "Santiago", testament: "new", chapterCount: 5 },
  { id: "1PE", name: "1 Pedro", testament: "new", chapterCount: 5 },
  { id: "2PE", name: "2 Pedro", testament: "new", chapterCount: 3 },
  { id: "1JN", name: "1 Juan", testament: "new", chapterCount: 5 },
  { id: "2JN", name: "2 Juan", testament: "new", chapterCount: 1 },
  { id: "3JN", name: "3 Juan", testament: "new", chapterCount: 1 },
  { id: "JUD", name: "Judas", testament: "new", chapterCount: 1 },
  { id: "REV", name: "Apocalipsis", testament: "new", chapterCount: 22 },
];

export const BIBLE_BOOK_BY_ID: ReadonlyMap<string, BibleBookInfo> = new Map(
  BIBLE_BOOKS.map((book) => [book.id, book]),
);

/** One locally imported translation, selected by the product owner. */
export const DEFAULT_TRANSLATION = { code: "rvr1960", label: "RVR1960" } as const;
