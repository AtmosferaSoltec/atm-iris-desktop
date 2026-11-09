import { z } from "@shared/zod";
import { isValidTimeZone } from "@shared/lib/zoned-time";

export const CHURCH_FIELDS = ["name", "timezone"] as const;
export type ChurchField = (typeof CHURCH_FIELDS)[number];

/** Contract §6: name 1–120, timezone a valid IANA zone. */
export const churchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre de la iglesia.")
    .max(120, "Usa un nombre más corto."),
  timezone: z.string().trim().refine(isValidTimeZone, "Elige una zona horaria de la lista."),
});

import { PROJECTION_FONT_KEYS, PROJECTION_FONT_SIZE } from "@shared/domain/projection-fonts";

/** How the lyrics look (contract §6), from "Texto" in the console. */
export const typographySchema = z.object({
  fontFamily: z.enum(PROJECTION_FONT_KEYS, "Esa tipografía no existe."),
  fontSizePt: z
    .number()
    .int()
    .min(PROJECTION_FONT_SIZE.min, `Mínimo ${PROJECTION_FONT_SIZE.min}.`)
    .max(PROJECTION_FONT_SIZE.max, `Máximo ${PROJECTION_FONT_SIZE.max}.`),
  fontBold: z.boolean(),
  fontItalic: z.boolean(),
  uppercase: z.boolean(),
});

export const projectionSchema = typographySchema.extend({
  defaultBackgroundId: z.string().max(64).nullable(),
});

/** The Bible's own look: a background (or none) and, once chosen, its own lettering. */
export const bibleAppearanceSchema = z.object({
  backgroundId: z.string().max(64).nullable(),
  typography: typographySchema.nullable(),
});

/** A passage the Bible window puts on the screens (the console builds the slides). */
export const biblePresentSchema = z.object({
  translation: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9]+$/),
  bookId: z.string().min(1).max(10),
  chapter: z.number().int().min(1).max(150),
  from: z.number().int().min(1).max(200),
  to: z.number().int().min(1).max(200),
});
