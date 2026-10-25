import { z } from "../zod";
import { youtubeIdSchema } from "./youtube";

export const youtubeCommandSchema = z.object({
  type: z.literal("iris-youtube:command"),
  id: youtubeIdSchema,
  playing: z.boolean(),
  position: z.number().finite().min(0),
  at: z.number().finite(),
  captions: z.boolean(),
  audible: z.boolean(),
});
export const youtubeMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("iris-youtube:ready") }),
  z.object({
    type: z.literal("iris-youtube:time"),
    id: youtubeIdSchema,
    position: z.number().finite().min(0),
    duration: z.number().finite().min(0),
  }),
  z.object({ type: z.literal("iris-youtube:error"), message: z.string().max(500) }),
]);
