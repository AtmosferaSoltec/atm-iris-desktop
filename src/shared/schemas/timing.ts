import { z } from "@shared/zod";
export const timingIdSchema = z.string().uuid();
export const personNameSchema = z
  .string()
  .trim()
  .min(1, "Escribe un nombre.")
  .max(80, "Usa un nombre más corto.");
export const personInputSchema = z.object({ name: personNameSchema });
export const personUpdateSchema = z.object({ id: timingIdSchema, name: personNameSchema });
export const serviceColors = ["amber", "coral", "rose", "violet", "indigo", "green"] as const;
export const serviceTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del servicio.")
    .max(60, "Usa un nombre más corto."),
  color: z.enum(serviceColors).default("amber"),
  schedule: z
    .object({
      weekday: z.number().int().min(1).max(7),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
    })
    .nullable()
    .default(null),
  blocks: z
    .array(
      z.object({
        id: timingIdSchema.optional(),
        name: z
          .string()
          .trim()
          .min(1, "Escribe el nombre del bloque.")
          .max(60, "Usa un nombre más corto."),
        plannedMinutes: z.number().int().min(1, "Mínimo 1 minuto.").max(240, "Máximo 240 minutos."),
      }),
    )
    .max(30, "Máximo 30 bloques."),
});
export const serviceTypeUpdateSchema = z.object({ id: timingIdSchema, input: serviceTypeSchema });
const instant = z.iso.datetime({ offset: true });
export const recordInputSchema = z.object({
  status: z.enum(["inProgress", "finished"]),
  date: instant,
  serviceTypeId: timingIdSchema.nullable(),
  serviceTypeName: z.string().trim().min(1).max(60),
  blocks: z
    .array(
      z.object({
        id: timingIdSchema,
        name: z.string().trim().min(1).max(60),
        plannedSeconds: z.number().int().min(0).max(86400),
        actualSeconds: z.number().int().min(0).max(86400),
        personId: timingIdSchema.nullable(),
        personName: z.string().trim().max(80).nullable(),
        status: z.enum(["pending", "running", "completed", "skipped", "adjusted"]),
        startedAt: instant.nullable(),
        endedAt: instant.nullable(),
      }),
    )
    .min(1)
    .max(60),
});
export const recordSaveSchema = z.object({ id: timingIdSchema, input: recordInputSchema });
export const recordListSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(100),
  serviceTypeId: timingIdSchema.optional(),
  status: z.enum(["inProgress", "finished"]).optional(),
  from: instant.optional(),
  to: instant.optional(),
});
export const blockAdjustmentSchema = z.object({
  recordId: timingIdSchema,
  blockId: timingIdSchema,
  actualSeconds: z
    .number()
    .int("Usa segundos enteros.")
    .min(0, "La duración no puede ser negativa.")
    .max(43200, "Revisa la duración: es demasiado larga."),
});
export const blockLeaderSchema = z.object({
  recordId: timingIdSchema,
  blockId: timingIdSchema,
  personId: timingIdSchema.nullable(),
});
export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;
export type ServiceRecordInput = z.infer<typeof recordInputSchema>;
