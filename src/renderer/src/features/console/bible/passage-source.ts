import { invoke } from "@renderer/lib/ipc";
import { passageId } from "@shared/lib/bible-reference";
import type { ConsoleItem } from "../model";
import { passageItem } from "./passage-item";

/** The one key the quick passage uses: a new one replaces the last. */
export const BIBLE_LIVE_KEY = "bible-live";

/**
 * The slides of a chosen passage (its whole chapter, with the verses as focus), or null when
 * a verse of it does not exist in this edition.
 */
export async function loadPassage(reference: {
  translation: string;
  bookId: string;
  chapter: number;
  from: number;
  to: number;
}): Promise<ConsoleItem | null> {
  const chapter = await invoke("bible:chapter", {
    translation: reference.translation,
    bookId: reference.bookId,
    chapter: reference.chapter,
  });
  const passage = {
    code: reference.translation,
    bookId: reference.bookId,
    chapter: reference.chapter,
    from: reference.from,
    to: Math.max(reference.to, reference.from),
  };
  const has = (number: number): boolean => chapter.verses.some((verse) => verse.number === number);
  if (!has(passage.from) || !has(passage.to)) return null;
  return passageItem(chapter, passage, {
    planItemId: BIBLE_LIVE_KEY,
    refId: passageId(passage),
  });
}
