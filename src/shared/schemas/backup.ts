import { z } from "../zod";
import { youtubeIdSchema } from "./songs";

const backupSongSchema = z.object({
  title: z.string().trim().min(1).max(120),
  author: z.string().trim().max(120),
  sections: z
    .array(
      z.object({ label: z.string().max(40).nullable(), text: z.string().trim().min(1).max(2000) }),
    )
    .max(80),
  youtubeId: youtubeIdSchema.nullable(),
});
export const backupFileSchema = z.object({
  format: z.literal("iris-backup"),
  version: z.literal(1),
  exportedAt: z.string().optional(),
  songs: z.array(backupSongSchema).max(50000).default([]),
  youtubeVideos: z
    .array(
      z.object({
        videoId: youtubeIdSchema,
        title: z.string().max(1000),
        author: z.string().max(1000),
      }),
    )
    .max(50000)
    .default([]),
});
export const eraseSchema = z
  .object({
    songs: z.boolean(),
    media: z.boolean(),
    youtube: z.boolean(),
    confirm: z.literal("ELIMINAR", "Escribe ELIMINAR para confirmar."),
  })
  .refine((value) => value.songs || value.media || value.youtube, "Elige qué eliminar.");
export type BackupFile = z.infer<typeof backupFileSchema>;
export type ImportResult = {
  songs: number;
  youtubeVideos: number;
  skipped: number;
  withoutLyrics: number;
};
export type EraseResult = { songs: number; media: number; youtube: number };
