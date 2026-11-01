import { z } from "../zod";

export const SONG_IMPORT_STATUSES = ["new", "duplicate", "invalid"] as const;
export type SongImportStatus = (typeof SONG_IMPORT_STATUSES)[number];

export type SongImportItem = {
  title: string;
  author: string;
  slides: number;
  status: SongImportStatus;
  /** Spanish explanation for `duplicate` and `invalid`. */
  reason: string | null;
};
export type SongImportPreview = {
  token: string;
  fileName: string;
  items: SongImportItem[];
};
export type SongImportResult = { imported: number; duplicates: number; invalid: number };

export const songImportConfirmSchema = z.object({ token: z.string().min(1).max(100) });

/** Where the operator picks the songs from: one or many files, or a whole folder. */
export const songImportSourceSchema = z.object({ source: z.enum(["files", "folder"]) });
