import { memo } from "react";
import type { BibleBookInfo } from "@shared/domain/bible-books";
import { cn } from "@renderer/lib/cn";

/** A book's chapters as small numbered chips; the one shown last is marked. */
export const ChapterGrid = memo(function ChapterGrid({
  book,
  current = null,
  onPick,
}: {
  book: BibleBookInfo;
  current?: number | null;
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
            aria-current={chapter === current ? "true" : undefined}
            className={cn(
              "grid size-14 cursor-pointer place-items-center rounded-lg font-mono text-lg tabular-nums transition ring-inset hover:bg-surface-raised",
              chapter === current ? "bg-surface-raised ring-2 ring-coral" : "ring-1 ring-line",
            )}
          >
            {chapter}
          </button>
        </li>
      ))}
    </ul>
  );
});
