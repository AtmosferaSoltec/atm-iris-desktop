import { memo, useEffect, useRef } from "react";
import { Spinner } from "@renderer/components/ui/spinner";
import type { BibleChapter } from "@shared/domain/bible";
import { cn } from "@renderer/lib/cn";

/** A chapter's verse numbers: a click puts one on the screens. */
export const VerseList = memo(function VerseList({
  chapter,
  isLoading,
  isMissing,
  selected,
  onPick,
}: {
  chapter: BibleChapter | null;
  isLoading: boolean;
  isMissing: boolean;
  /** The verse a typed reference points at. */
  selected: number | null;
  onPick: (verse: number) => void;
}) {
  const target = useRef<HTMLLIElement>(null);

  // "Juan 3:16" typed in lands on its verse.
  useEffect(() => {
    target.current?.scrollIntoView({ block: "center" });
  }, [chapter, selected]);

  if (isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-ink-2">
        <Spinner className="size-4" /> Abriendo el capítulo…
      </p>
    );
  }
  if (isMissing || !chapter) {
    return <p className="px-2 py-8 text-center text-sm text-danger">Ese capítulo no existe.</p>;
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,3.5rem)] gap-2 p-0.5">
      {chapter.verses
        .filter((verse) => verse.text.trim())
        .map((verse) => (
          <li key={verse.number} ref={verse.number === selected ? target : undefined}>
            <button
              type="button"
              onClick={() => onPick(verse.number)}
              aria-current={verse.number === selected ? "true" : undefined}
              className={cn(
                "grid size-14 cursor-pointer place-items-center rounded-lg font-mono text-lg tabular-nums ring-1 transition ring-inset",
                verse.number === selected
                  ? "bg-violet/18 ring-violet/50"
                  : "ring-line hover:bg-surface-raised",
              )}
            >
              {verse.number}
            </button>
          </li>
        ))}
    </ul>
  );
});
