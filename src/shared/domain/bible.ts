export type BibleChapter = {
  translation: string;
  translationLabel?: string;
  bookId: string;
  chapter: number;
  verses: { number: number; text: string }[];
};
export type BibleTranslation = {
  code: string;
  name: string;
  verseCount: number;
  importedAt: string;
  copyright: string;
};
export type BibleStatus = {
  translations: BibleTranslation[];
  selectedTranslation: string | null;
  isImported: boolean;
  verseCount: number;
  importedAt: string | null;
  copyright: string | null;
};
