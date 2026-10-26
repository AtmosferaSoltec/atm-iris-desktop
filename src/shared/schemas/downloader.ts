import { z } from "../zod";
import { youTubeVideoId } from "../lib/youtube";

export const downloaderInputSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((url) => Boolean(youTubeVideoId(url)), "Escribe el enlace de un video de YouTube."),
  format: z.enum(["mp4", "mp3"]),
  quality: z.enum(["360", "720"]).default("720"),
  audioRole: z.enum(["track", "sound"]).default("track"),
});
export type DownloaderInput = z.infer<typeof downloaderInputSchema>;
export type DownloadPhase =
  "checking" | "downloading" | "converting" | "importing" | "completed" | "cancelled" | "failed";
export type DownloadJob = {
  id: string;
  phase: DownloadPhase;
  title: string;
  progress: number;
  message: string | null;
  assetId: string | null;
};
export type DownloaderStatus = {
  isAvailable: boolean;
  isEnabled: boolean;
  isInstalling: boolean;
  version: string | null;
  hasFfmpeg: boolean;
  updateError: string | null;
  job: DownloadJob | null;
};
