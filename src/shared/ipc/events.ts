import { updateStatusSchema } from "../schemas/updates";
import type { Monitor, ProjectionStatus } from "../domain/monitors";
import type { ProjectionFrame } from "../domain/projection";
import { projectionFrameSchema, videoTimeSchema } from "../schemas/projection";
import { z } from "@shared/zod";
import { bibleAppearanceSchema, biblePresentSchema } from "../schemas/settings";
import { remoteCommandSchema, type RemoteStatus } from "../remote/protocol";

export const eventContract = {
  "updates:changed": updateStatusSchema,
  "projection:error": z.string().min(1).max(200),
  "projection:frame": projectionFrameSchema as z.ZodType<ProjectionFrame>,
  "projection:status": z.custom<ProjectionStatus>(),
  "projection:video-time": videoTimeSchema,
  "monitors:changed": z.custom<Monitor[]>(),
  "media:changed": z.void(),
  /** The settings window lost focus or closed: the console reloads what it shows. */
  "settings:changed": z.void(),
  /** The Bible window picked a passage: the console puts it on the screens. */
  "bible:present": biblePresentSchema,
  /** The Bible's background or lettering changed in its window. */
  "bible:appearance": bibleAppearanceSchema,
  /** The Bible window closed: a passage still on the screens leaves them. */
  "bible:closed": z.void(),
  "remote:changed": z.custom<RemoteStatus>(),
  "remote:command": remoteCommandSchema,
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
