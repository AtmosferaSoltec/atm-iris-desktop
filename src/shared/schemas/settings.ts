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
