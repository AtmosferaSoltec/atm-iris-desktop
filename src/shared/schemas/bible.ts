import { z } from "../zod";
import { BIBLE_BOOK_BY_ID } from "../domain/bible-books";

export const bibleTranslationSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+$/);

export const bibleChapterSchema = z
  .object({
    translation: bibleTranslationSchema.optional(),
    bookId: z.string().refine((id) => BIBLE_BOOK_BY_ID.has(id), "Ese libro no existe."),
    chapter: z.number().int().min(1).max(150),
  })
  .refine((input) => {
    const book = BIBLE_BOOK_BY_ID.get(input.bookId);
    return !book || input.chapter <= book.chapterCount;
  }, "Ese capítulo no existe.");
