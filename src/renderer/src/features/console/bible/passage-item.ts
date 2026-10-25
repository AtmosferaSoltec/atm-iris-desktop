import { BIBLE_BOOK_BY_ID } from "@shared/domain/bible-books";
import type { BibleChapter } from "@shared/domain/bible";
import { passageLabel, type Passage } from "@shared/lib/bible-reference";
import type { ConsoleItem } from "../model";

/**
 * A passage as the console shows it: its whole chapter, one verse per slide (empty verses,
 * joined to the one before in this edition, are left out), with the chosen verses as its
 * focus. "Anterior" and "siguiente" are just the slides around it.
 */
export function passageItem(
  chapter: BibleChapter,
  passage: Passage,
  key: { planItemId: string; refId: string },
): ConsoleItem {
  const book = BIBLE_BOOK_BY_ID.get(passage.bookId)?.name ?? passage.bookId;
  const translation = chapter.translationLabel ?? passage.code.toUpperCase();
  const verses = chapter.verses.filter((verse) => verse.text.trim());
  const first = verses.findIndex((verse) => verse.number >= passage.from);
  const last = verses.findLastIndex((verse) => verse.number <= passage.to);
  return {
    ...key,
    kind: "bible",
    title: passageLabel(passage),
    subtitle: translation,
    slides: verses.map((verse) => ({
      id: String(verse.number),
      label: `${book} ${passage.chapter}:${verse.number}`,
      text: verse.text,
      footnote: `${book} ${passage.chapter}:${verse.number} · ${translation}`,
    })),
    file: null,
    focus: { first: Math.max(first, 0), last: Math.max(last, first, 0) },
  };
}
