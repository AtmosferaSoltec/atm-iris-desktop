import { memo } from "react";
import type { BibleBookInfo } from "@shared/domain/bible-books";

/** A book's chapters as small numbered chips. */
export const ChapterGrid = memo(function ChapterGrid({
  book,
  onPick,
}: {
  book: BibleBookInfo;
  onPick: (chapter: number) => void;
}) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,3.5rem)] gap-2 p-0.5">
      {Array.from({ length: book.chapterCount }, (_, index) => index + 1).map((chapter) => (
        <li key={chapter}>
          <button
            type="button"
            onClick={() => onPick(chapter)}
            aria-label={`${book.name} ${chapter}`}
            className="grid size-14 cursor-pointer place-items-center rounded-lg font-mono text-lg tabular-nums ring-1 ring-line transition ring-inset hover:bg-surface-raised"
          >
            {chapter}
          </button>
        </li>
      ))}
    </ul>
  );
});
