import { z } from "../zod";

export type AudioMatchItem = {
  songId: string;
  title: string;
  author: string;
  fileName: string;
};
export type AudioMatchPreview = {
  token: string;
  matches: AudioMatchItem[];
  /** Songs without a track that found no file, and files in Iris/Audio that found no song. */
  unmatchedSongs: { title: string; author: string }[];
  unmatchedFiles: string[];
};
export type AudioMatchResult = { assigned: number; skipped: number };

export const audioMatchConfirmSchema = z.object({
  token: z.string().min(1).max(100),
  songIds: z.array(z.string().uuid()).max(5000),
});
