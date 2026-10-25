import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "@shared/zod";
import { BIBLE_BOOKS } from "@shared/domain/bible-books";
import { AppError } from "@shared/errors";

export type ImportedBible = {
  code: string;
  name: string;
  copyright: string;
  verses: { bookId: string; chapter: number; number: number; text: string }[];
};
export const MAX_BIBLE_BYTES = 16 * 1024 * 1024;
const number = z
  .string()
  .regex(/^[1-9]\d{0,2}$/)
  .transform(Number);
const verse = z.object({ number, text: z.string().trim().min(1).max(2000) }).strict();
const chapter = z.object({ number, verse: z.array(verse).min(1).max(200) }).strict();
const book = z.object({ number, chapter: z.array(chapter).min(1).max(150) }).strict();
const documentSchema = z
  .object({
    bible: z
      .object({
        translation: z.string().trim().min(1).max(500),
        status: z.string().max(4000).default(""),
        link: z.string().max(2048).optional(),
        testament: z
          .array(
            z.object({ name: z.enum(["Old", "New"]), book: z.array(book).min(1).max(39) }).strict(),
          )
          .length(2),
      })
      .strict(),
  })
  .passthrough();

export function parseBibleXml(xml: string): ImportedBible {
  const fail = (): never => {
    throw new AppError(
      "VALIDATION_FAILED",
      "Ese archivo no es una Biblia completa en el formato XML compatible.",
    );
  };
  // No DTD/custom entities, external resources or nested verse markup are needed for this format.
  if (Buffer.byteLength(xml, "utf8") > MAX_BIBLE_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) fail();
  if (XMLValidator.validate(xml) !== true) fail();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    ignoreDeclaration: true,
    isArray: (name) => ["testament", "book", "chapter", "verse"].includes(name),
  });
  let raw: unknown;
  try {
    raw = parser.parse(xml);
  } catch {
    return fail();
  }
  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success) return fail();
  const testaments = parsed.data.bible.testament;
  if (
    testaments[0].name !== "Old" ||
    testaments[1].name !== "New" ||
    testaments[0].book.length !== 39 ||
    testaments[1].book.length !== 27
  )
    fail();
  const books = testaments.flatMap((testament) => testament.book);
  const verses: ImportedBible["verses"] = [];
  for (const [index, entry] of books.entries()) {
    const expected = BIBLE_BOOKS[index];
    if (!expected || entry.number !== index + 1 || entry.chapter.length !== expected.chapterCount)
      fail();
    for (const [chapterIndex, chapter] of entry.chapter.entries()) {
      if (chapter.number !== chapterIndex + 1) fail();
      for (const [verseIndex, verse] of chapter.verse.entries()) {
        if (verse.number !== verseIndex + 1) fail();
        verses.push({
          bookId: expected.id,
          chapter: chapter.number,
          number: verse.number,
          text: verse.text,
        });
      }
    }
  }
  const name = parsed.data.bible.translation;
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const code = /(?:rvr|rv|reinavalera)(?:19)?60/.test(normalized)
    ? "rvr1960"
    : /(?:rvr|rv|reinavalera)(?:19)?09/.test(normalized)
      ? "rvr1909"
      : /(?:nvi|nuevaversioninternacional)/.test(normalized)
        ? "nvi"
        : createHash("sha256").update(normalized).digest("hex").slice(0, 20);
  return { code, name, copyright: parsed.data.bible.status, verses };
}
