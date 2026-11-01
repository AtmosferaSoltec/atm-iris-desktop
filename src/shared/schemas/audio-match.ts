import { z } from "../zod";

export type AudioMatchItem = {
  songId: string;
  fileId: string;
  /** False for a loose suggestion: it starts unchecked so the operator reviews it. */
  isSure: boolean;
  title: string;
  author: string;
  fileName: string;
};
export type AudioMatchPreview = {
  token: string;
  matches: AudioMatchItem[];
  /** Songs without a track that found no file, and files in Iris/Audio that found no song. */
  unmatchedSongs: { songId: string; title: string; author: string }[];
  unmatchedFiles: { id: string; fileName: string }[];
};
export type AudioMatchResult = { assigned: number; skipped: number };

export const audioMatchConfirmSchema = z.object({
  token: z.string().min(1).max(100),
  /** What the operator chose: automatic matches that stayed checked plus the ones joined by hand. */
  pairs: z.array(z.object({ songId: z.string().uuid(), fileId: z.string().min(1) })).max(5000),
});
