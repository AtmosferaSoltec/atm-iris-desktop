import { z } from "@shared/zod";
export const planTargetSchema = z.object({
  kind: z.enum(["song", "media"]),
  refId: z.string().uuid(),
});
export const planMoveSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0).max(10000),
});
export const planIdSchema = z.string().uuid();
export const slideEditSchema = z.object({
  songId: z.string().uuid(),
  index: z.number().int().min(0).max(79),
  previousText: z.string().max(2000),
  text: z.string().min(1).max(20000),
});
