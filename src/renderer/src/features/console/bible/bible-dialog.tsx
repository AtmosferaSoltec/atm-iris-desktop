import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@renderer/lib/ipc";
import { Banner } from "@renderer/components/ui/banner";
import { Select } from "@renderer/components/ui/select";

import { ChevronRight, CornerDownLeft, Search } from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog } from "@renderer/components/ui/dialog";
import { Spinner } from "@renderer/components/ui/spinner";
import { TextField } from "@renderer/components/ui/text-field";
import { type BibleBookInfo } from "@shared/domain/bible-books";
import { cn } from "@renderer/lib/cn";
import { completeBookName, parseReference, passageId } from "@shared/lib/bible-reference";
import type { LiveConsole } from "../use-live-console";
import { BookList, type BookOrder } from "./book-list";
import { ChapterGrid } from "./chapter-grid";
import { passageItem } from "./passage-item";
import { loadChapter, useChapter } from "./use-chapter";
import { VerseList } from "./verse-list";

/** The one key the quick passage uses: a new one replaces the last. */
const QUICK_KEY = "bible-live";

/**
 * "Biblia" (V): when the preacher says "Juan 3:16", type it and press Enter: the verse is on
 * the screens at once, without going through the service. Or pick book → chapter → verse.
 */
export function BibleDialog({
  ctrl,
  onClose,
}: {
  ctrl: Pick<LiveConsole, "presentPassage">;
  onClose: () => void;
}) {
  const status = useQuery({
    queryKey: ["bible", "status"],
    queryFn: () => invoke("bible:status", undefined),
  });
  const client = useQueryClient();
  const selected = status.data?.selectedTranslation ?? null;
  const translation = status.data?.translations.find((entry) => entry.code === selected);
  const selection = useMutation({
    mutationFn: (code: string) => invoke("bible:select", code),
    onSuccess: (result) => {
      client.setQueryData(["bible", "status"], result);
      setError(null);
    },
  });
  const [query, setQuery] = useState("");
  const [book, setBook] = useState<BibleBookInfo | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [verse, setVerse] = useState<{ from: number; to: number } | null>(null);
  const [order, setOrder] = useState<BookOrder>("canonical");
  const [error, setError] = useState<string | null>(null);
  const [isProjecting, startProject] = useTransition();
  const chapter = useChapter(selected, book?.id ?? null, chapterNumber);

  function search(text: string) {
    setQuery(text);
    setError(null);
    const reference = parseReference(text);
    if (!reference) {
      setVerse(null);
      setChapterNumber(null);
      setBook(null);
      return;
    }
    setBook(reference.book);
    setChapterNumber(reference.chapter);
    setVerse(reference.from ? { from: reference.from, to: reference.to ?? reference.from } : null);
  }

  function project(bookId: string, chapterNo: number, from: number, to = from) {
    startProject(async () => {
      if (!selected) return;
      const found = await loadChapter(selected, bookId, chapterNo);
      if (
        !found ||
        !found.verses.some((candidate) => candidate.number === from) ||
        !found.verses.some((candidate) => candidate.number === to)
      ) {
        setError("Ese versículo no existe.");
        return;
      }
      const passage = { code: selected, bookId, chapter: chapterNo, from, to };
      const item = passageItem(found, passage, {
        planItemId: QUICK_KEY,
        refId: passageId(passage),
      });
      ctrl.presentPassage(item, item.focus?.first ?? 0);
      onClose();
    });
  }

  function goTo(level: "books" | "chapters") {
    setVerse(null);
    setChapterNumber(null);
    if (level === "books") setBook(null);
    setQuery("");
  }

  const ready = book && chapterNumber;

  if (!status.data?.isImported)
    return (
      <Dialog open onClose={onClose} title="Biblia" size="md">
        <div className="flex flex-col gap-5 pb-6">
          {status.isPending ? (
            <Spinner />
          ) : status.isError ? (
            <Banner tone="error">{status.error.message}</Banner>
          ) : (
            <>
              <p className="text-sm text-ink-2">
                No hay Biblias importadas. Ve a Configuración → Biblias para importar un archivo
                XML. Después podrás consultar y proyectar sus versículos sin internet.
              </p>
            </>
          )}
        </div>
      </Dialog>
    );
  return (
    <Dialog open onClose={onClose} title="Biblia" size="lg">
      <div className="flex flex-col gap-3 pb-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) project(book.id, chapterNumber, verse?.from ?? 1, verse?.to ?? 1);
          }}
        >
          <TextField
            id="bible-quick"
            type="search"
            aria-label="Versículo"
            placeholder="Juan 3:16"
            icon={<Search />}
            value={query}
            onChange={(event) => {
              const text = event.target.value;
              const isDeleting = (event.nativeEvent as InputEvent).inputType?.startsWith("delete");
              const completion = isDeleting ? null : completeBookName(text);
              search(completion?.text ?? text);
              if (completion) {
                event.currentTarget.value = completion.text;
                event.currentTarget.setSelectionRange(
                  completion.selectionStart,
                  completion.text.length,
                );
              }
            }}
            error={error ?? undefined}
            autoComplete="off"
            autoFocus
            className="h-12 text-lg"
            accessory={
              ready ? (
                <span className="flex items-center gap-1.5 text-xs text-ink-2">
                  {isProjecting ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <CornerDownLeft className="size-3.5" />
                  )}
                  Enter para proyectar
                </span>
              ) : undefined
            }
          />
        </form>

        <nav
          aria-label="Dónde estás"
          className="flex flex-wrap items-center gap-1 px-1 text-xs text-ink-2"
        >
          <button
            type="button"
            onClick={() => goTo("books")}
            className="cursor-pointer hover:text-ink"
          >
            Libros
          </button>
          {book && (
            <>
              <ChevronRight aria-hidden className="size-3" />
              <button
                type="button"
                onClick={() => goTo("chapters")}
                className="cursor-pointer hover:text-ink"
              >
                {book.name}
              </button>
            </>
          )}
          {book && chapterNumber && (
            <>
              <ChevronRight aria-hidden className="size-3" />
              <span className="text-ink">Capítulo {chapterNumber}</span>
            </>
          )}
          {!book && (
            <div role="tablist" aria-label="Orden de los libros" className="ml-auto flex gap-0.5">
              {(
                [
                  ["canonical", "Tradicional"],
                  ["alphabetical", "A–Z"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={order === value}
                  onClick={() => setOrder(value)}
                  className={cn(
                    "cursor-pointer rounded-md px-2 py-0.5 transition",
                    order === value ? "bg-surface text-ink" : "hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {status.data.translations.length > 1 ? (
            <Select
              id="bible-translation"
              ariaLabel="Traducción de la Biblia"
              value={selected ?? undefined}
              options={status.data.translations.map((entry) => ({
                value: entry.code,
                label: entry.name,
              }))}
              onValueChange={(code) => selection.mutate(code)}
              disabled={selection.isPending}
              className="h-8 text-xs"
              containerClassName="min-w-0 max-w-64"
            />
          ) : (
            <span className="min-w-0 truncate">{translation?.name}</span>
          )}
        </nav>

        <div className="h-[46vh] overflow-y-auto">
          {!book ? (
            <BookList query={query} order={order} onPick={setBook} />
          ) : !chapterNumber ? (
            <ChapterGrid book={book} onPick={setChapterNumber} />
          ) : (
            <VerseList
              chapter={chapter.chapter}
              isLoading={chapter.isLoading}
              isMissing={chapter.isMissing}
              selected={verse?.from ?? null}
              onPick={(number) => project(book.id, chapterNumber, number)}
            />
          )}
        </div>
        {translation?.copyright && (
          <p className="border-t border-line pt-3 text-xs text-ink-2">{translation.copyright}</p>
        )}
      </div>
    </Dialog>
  );
}
