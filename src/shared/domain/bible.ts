export type BibleChapter = {
  translation: "rvr1960";
  bookId: string;
  chapter: number;
  verses: { number: number; text: string }[];
};
export type BibleStatus = {
  isImported: boolean;
  verseCount: number;
  importedAt: string | null;
  copyright: string | null;
};
