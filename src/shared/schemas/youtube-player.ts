import { z } from "../zod";
export const youtubeIdSchema = z
  .string()
  .regex(/^[\w-]{11}$/, "Ese video de YouTube no es válido.");

export const youtubeCommandSchema = z.object({
  type: z.literal("iris-youtube:command"),
  id: youtubeIdSchema,
  playing: z.boolean(),
  position: z.number().finite().min(0),
  at: z.number().finite(),
  captions: z.boolean().default(false),
  audible: z.boolean(),
  volume: z.number().min(0).max(1).optional(),
});
export const youtubeMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("iris-youtube:ready") }),
  z.object({
    type: z.literal("iris-youtube:time"),
    id: youtubeIdSchema,
    position: z.number().finite().min(0),
    duration: z.number().finite().min(0),
    title: z.string().max(200).optional(),
  }),
  z.object({ type: z.literal("iris-youtube:error"), message: z.string().max(500) }),
]);
