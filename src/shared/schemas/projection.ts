import type { ProjectionFrame } from "@shared/domain/projection";
import { z } from "@shared/zod";
import { typographySchema } from "./settings";

const assetId = z.string().uuid();
const assetUrl = z
  .string()
  .regex(/^iris-media:\/\/asset\/[\da-f-]{36}$/i, "Ese archivo no existe.");
const position = {
  playing: z.boolean(),
  position: z.number().finite().min(0),
  at: z.number().finite().min(0),
};
export const projectionBackgroundSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(120),
  colors: z
    .array(
      z
        .string()
        .max(80)
        .regex(/^(#[\da-f]{3,8}|var\(--color-[a-z0-9-]+\))$/i),
    )
    .min(2)
    .max(8),
  imageUrl: assetUrl.optional(),
  videoUrl: assetUrl.optional(),
  durationSeconds: z.number().finite().min(0).nullable().optional(),
});
export const projectionContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("blank") }),
  z.object({
    kind: z.literal("text"),
    text: z.string().max(2000),
    footnote: z.string().max(200).nullable(),
  }),
  z.object({
    kind: z.literal("timer"),
    seconds: z.number().finite().min(0).max(5999),
    running: z.boolean(),
    at: z.number().finite().min(0),
    label: z.string().max(60).optional(),
  }),
  z.object({ kind: z.literal("image"), id: assetId, url: assetUrl }),
  z.object({
    kind: z.literal("video"),
    id: assetId,
    url: assetUrl,
    ...position,
    muted: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("youtube"),
    id: z.string().regex(/^[\w-]{11}$/),
    ...position,
    captions: z.boolean(),
    muted: z.boolean().optional(),
  }),
]);
export const projectionFrameSchema: z.ZodType<ProjectionFrame> = z.object({
  background: projectionBackgroundSchema.nullable(),
  content: projectionContentSchema,
  typography: typographySchema,
});
export const projectionStartSchema = z.object({
  monitorId: z.number().int().optional(),
  isPreview: z.boolean().default(false),
});
export const videoTimeSchema = z.object({
  id: z.string().min(1).max(64),
  position: z.number().finite().min(0),
  duration: z.number().finite().min(0),
});
