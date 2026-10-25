import { useQuery } from "@tanstack/react-query";
import { invoke } from "@renderer/lib/ipc";
import { queryClient } from "@renderer/lib/query-client";
import type { BibleChapter } from "@shared/domain/bible";

const chapterOptions = (
  translation: string,
  bookId: string,
  chapter: number,
): {
  queryKey: readonly [string, string, string, string, number];
  queryFn: () => Promise<BibleChapter>;
  staleTime: number;
} => ({
  queryKey: ["bible", "chapter", translation, bookId, chapter],
  queryFn: () => invoke("bible:chapter", { translation, bookId, chapter }),
  staleTime: Infinity,
});
export async function loadChapter(
  translation: string,
  bookId: string,
  chapter: number,
): Promise<BibleChapter | null> {
  try {
    return await queryClient.fetchQuery(chapterOptions(translation, bookId, chapter));
  } catch {
    return null;
  }
}
export function useChapter(
  translation: string | null,
  bookId: string | null,
  chapter: number | null,
): { chapter: BibleChapter | null; isLoading: boolean; isMissing: boolean } {
  const enabled = translation !== null && bookId !== null && chapter !== null;
  const query = useQuery({
    ...chapterOptions(translation ?? "", bookId ?? "", chapter ?? 0),
    enabled,
  });
  return {
    chapter: query.data ?? null,
    isLoading: enabled && query.isPending,
    isMissing: enabled && query.isError,
  };
}
