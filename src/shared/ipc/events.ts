import type { Monitor, ProjectionStatus } from "../domain/monitors";
import type { ProjectionFrame } from "../domain/projection";
import { projectionFrameSchema, videoTimeSchema } from "../schemas/projection";
import { z } from "@shared/zod";

export const eventContract = {
  "projection:error": z.string().min(1).max(200),
  "projection:frame": projectionFrameSchema as z.ZodType<ProjectionFrame>,
  "projection:status": z.custom<ProjectionStatus>(),
  "projection:video-time": videoTimeSchema,
  "monitors:changed": z.custom<Monitor[]>(),
  "media:changed": z.void(),
  "media:import-progress": z.object({
    fileName: z.string(),
    completedBytes: z.number(),
    totalBytes: z.number(),
  }),
};
export type EventName = keyof typeof eventContract;
export type EventData<K extends EventName> = z.infer<(typeof eventContract)[K]>;
export type EventApi = {
  onEvent: <K extends EventName>(name: K, listener: (data: EventData<K>) => void) => () => void;
};
