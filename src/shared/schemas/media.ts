import { SOUND_ICON_KEYS } from "@shared/domain/sounds";
import { z } from "@shared/zod";

export const mediaRoleSchema = z.enum(["library", "background", "track", "sound"]);
export const mediaIdSchema = z.string().uuid("Ese archivo no existe.");
export const mediaListSchema = z
  .object({
    kind: z.enum(["all", "image", "video", "audio"]).default("all"),
    role: mediaRoleSchema.optional(),
    search: z.string().max(200).default(""),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .default({ kind: "all", search: "", page: 1, limit: 50 });
export const mediaImportSchema = z.object({
  role: mediaRoleSchema,
  paths: z.array(z.string().min(1)).max(100).optional(),
});
export const mediaMeasuresSchema = z.object({
  id: mediaIdSchema,
  durationSeconds: z.number().finite().min(0).max(86400).nullable(),
  width: z.number().int().min(1).max(100000).nullable(),
  height: z.number().int().min(1).max(100000).nullable(),
});
export const mediaDetailsSchema = z.object({
  id: mediaIdSchema,
  title: z.string().trim().min(1, "Escribe un título.").max(120, "Usa un título más corto."),
  description: z.string().trim().max(500, "Usa una descripción más corta.").nullable(),
});
export const mediaRoleChangeSchema = z.object({
  id: mediaIdSchema,
  role: mediaRoleSchema,
  soundIcon: z.enum(SOUND_ICON_KEYS).nullable().optional(),
});
