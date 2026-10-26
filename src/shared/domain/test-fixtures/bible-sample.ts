import { BIBLE_BOOKS } from "../bible-books";

/** Synthetic text only: tests never redistribute an actual translation. */
export function bibleSampleXml(): string {
  const testament = (kind: "old" | "new"): string =>
    BIBLE_BOOKS.map((book, index) => ({ book, index }))
      .filter(({ book }) => book.testament === kind)
      .map(
        ({ book, index }) =>
          `<book number="${index + 1}">${Array.from({ length: book.chapterCount }, (_, chapter) => `<chapter number="${chapter + 1}">${Array.from({ length: book.id === "JHN" && chapter === 2 ? 36 : book.id === "PSA" && chapter === 95 ? 13 : 1 }, (_, verse) => `<verse number="${verse + 1}">Texto de prueba ${book.id} ${chapter + 1}:${verse + 1}</verse>`).join("")}</chapter>`).join("")}</book>`,
      )
      .join("");
  return `<bible translation="Spanish RVR 1960" status="Aviso de prueba"><testament name="Old">${testament("old")}</testament><testament name="New">${testament("new")}</testament></bible>`;
}
