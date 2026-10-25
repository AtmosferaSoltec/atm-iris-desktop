import { z } from "@shared/zod";
import { LYRICS_LIMITS, parseLyrics } from "@shared/lib/lyrics";
const idSchema = z.string().uuid("Ese elemento no existe.");

export const SONG_FIELDS = [
  "title",
  "author",
  "lyrics",
  "audioId",
  "youtubeId",
  "backgroundId",
] as const;
export type SongField = (typeof SONG_FIELDS)[number];

const title = z
  .string()
  .trim()
  .min(1, "Escribe el título de la canción.")
  .max(120, "Usa un título más corto.");
const author = z.string().trim().max(120, "Usa un nombre más corto.");
// Empty is fine when the song has a track (contract §10: lyrics, track or both).
const lyrics = z
  .string()
  .max(20_000, "La letra es demasiado larga.")
  .transform((value) => parseLyrics(value))
  .refine(
    (sections) => sections.length <= LYRICS_LIMITS.maxSections,
    `Usa como máximo ${LYRICS_LIMITS.maxSections} diapositivas.`,
  )
  .refine(
    (sections) =>
      sections.every((section) => (section.label?.length ?? 0) <= LYRICS_LIMITS.maxLabelLength),
    `Un nombre de diapositiva (#…) tiene como máximo ${LYRICS_LIMITS.maxLabelLength} caracteres.`,
  );
/** The uploaded track's id; empty when the song has none. */
const audioId = z
  .union([idSchema, z.literal("")])
  .optional()
  .transform((value) => value || null);

/** A YouTube video id (contract §10): 11 letters, digits, `-` or `_`. */
export const youtubeIdSchema = z.string().regex(/^[\w-]{11}$/, "Ese no es un video de YouTube.");
/** The track on YouTube; empty when the song has none. */
const youtubeId = z
  .union([youtubeIdSchema, z.literal("")])
  .optional()
  .transform((value) => value || null);

/** The song's background; empty clears it, absent (an editor without backgrounds) keeps it. */
const backgroundId = z
  .union([idSchema, z.literal("")])
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

const songSchema = z
  .object({ title, author, lyrics, audioId, youtubeId, backgroundId })
  .superRefine((song, ctx) => {
    if (song.audioId !== null && song.youtubeId !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["youtubeId"],
        message: "La pista es un audio o un video de YouTube, no los dos.",
      });
    }
    if (song.lyrics.length === 0 && song.audioId === null && song.youtubeId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["lyrics"],
        message:
          "Pega la letra o elige una pista: separa cada diapositiva con una línea en blanco.",
      });
    }
  })
  .transform(({ lyrics: sections, ...rest }) => ({
    ...rest,
    sections,
  }));

/** Parses the editor form into the contract's `SongInput`. */
export const songFormSchema = songSchema;

/** What the track picker sends: a pasted link. */
export const youTubeLinkSchema = z.string().trim().min(1).max(500);

export const songInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Escribe el título de la canción.")
      .max(120, "Usa un título más corto."),
    author: z.string().trim().max(120, "Usa un nombre más corto."),
    sections: z
      .array(
        z.object({
          label: z.string().max(40).nullable(),
          text: z.string().trim().min(1).max(2000),
        }),
      )
      .max(80),
    audioId: idSchema.nullable(),
    youtubeId: youtubeIdSchema.nullable(),
    backgroundId: idSchema.nullable().optional(),
  })
  .superRefine((song, ctx) => {
    if (song.audioId && song.youtubeId)
      ctx.addIssue({
        code: "custom",
        path: ["youtubeId"],
        message: "La pista es un audio o un video de YouTube, no los dos.",
      });
    if (!song.sections.length && !song.audioId && !song.youtubeId)
      ctx.addIssue({ code: "custom", path: ["sections"], message: "Agrega la letra o una pista." });
  });
export type SongInput = z.infer<typeof songInputSchema>;
export const songListSchema = z.object({
  search: z.string().max(200).default(""),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sort: z.enum(["title", "-updatedAt"]).default("title"),
  archived: z.boolean().default(false),
});
export const songIdSchema = idSchema;
export const songUpdateSchema = z.object({ id: idSchema, input: songInputSchema });
export const songDeleteSchema = z.object({ id: idSchema, deleteAudio: z.boolean().default(false) });
