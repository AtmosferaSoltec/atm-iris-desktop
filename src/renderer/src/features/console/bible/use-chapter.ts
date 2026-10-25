import { useQuery } from "@tanstack/react-query";
import { invoke } from "@renderer/lib/ipc";
import { queryClient } from "@renderer/lib/query-client";
import type { BibleChapter } from "@shared/domain/bible";

const chapterOptions = (
  bookId: string,
  chapter: number,
): {
  queryKey: readonly [string, string, string, number];
  queryFn: () => Promise<BibleChapter>;
  staleTime: number;
} => ({
  queryKey: ["bible", "chapter", bookId, chapter],
  queryFn: () => invoke("bible:chapter", { bookId, chapter }),
  staleTime: Infinity,
});
export async function loadChapter(bookId: string, chapter: number): Promise<BibleChapter | null> {
  try {
    return await queryClient.fetchQuery(chapterOptions(bookId, chapter));
  } catch {
    return null;
  }
}
export function useChapter(
  bookId: string | null,
  chapter: number | null,
): { chapter: BibleChapter | null; isLoading: boolean; isMissing: boolean } {
  const enabled = bookId !== null && chapter !== null;
  const query = useQuery({ ...chapterOptions(bookId ?? "", chapter ?? 0), enabled });
  return {
    chapter: query.data ?? null,
    isLoading: enabled && query.isPending,
    isMissing: enabled && query.isError,
  };
}
