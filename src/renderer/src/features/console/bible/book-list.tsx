import { memo } from "react";
import { BIBLE_BOOKS, type BibleBookInfo } from "@shared/domain/bible-books";
import { nameKey } from "@shared/lib/text";

export type BookOrder = "canonical" | "alphabetical";

/** "1 Samuel" files under S, like in an index. */
const sortName = (name: string): string => name.replace(/^\d+\s+/, "");

/** The 66 books, in Bible order (by testament) or A–Z; typing narrows them. */
export const BookList = memo(function BookList({
  query,
  order,
  onPick,
}: {
  query: string;
  order: BookOrder;
  onPick: (book: BibleBookInfo) => void;
}) {
  const key = nameKey(query).replace(/\s+/g, "");
  const books = key
    ? BIBLE_BOOKS.filter((book) => nameKey(book.name).replace(/\s+/g, "").includes(key))
    : BIBLE_BOOKS;
  const sections = (
    order === "alphabetical"
      ? [
          {
            title: "",
            books: [...books].sort((a, b) =>
              sortName(a.name).localeCompare(sortName(b.name), "es"),
            ),
          },
        ]
      : [
          { title: "Antiguo Testamento", books: books.filter((book) => book.testament === "old") },
          { title: "Nuevo Testamento", books: books.filter((book) => book.testament === "new") },
        ]
  ).filter((section) => section.books.length > 0);

  if (sections.length === 0) {
    return <p className="px-2 py-8 text-center text-sm text-ink-2">Ningún libro se llama así.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <section key={section.title || "all"} className="flex flex-col gap-1">
          {section.title && <h3 className="px-2 eyebrow text-ink-2">{section.title}</h3>}
          <ul className="grid grid-cols-2 gap-x-1">
            {section.books.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => onPick(book)}
                  className="w-full cursor-pointer truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                >
                  {book.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
});
