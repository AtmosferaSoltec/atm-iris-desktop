import { z } from "../zod";
import { youTubeVideoId } from "../lib/youtube";

export const youtubeLinkSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => youTubeVideoId(value) !== null, "Ese enlace no es de un video de YouTube.");
export const youtubeIdSchema = z
  .string()
  .regex(/^[\w-]{11}$/, "Ese video de YouTube no es válido.");
export const savedYoutubeIdSchema = z.uuid();
