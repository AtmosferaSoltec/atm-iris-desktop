import { bibleChapterSchema } from "../schemas/bible";
import type { BibleChapter, BibleStatus } from "../domain/bible";
import { eraseSchema } from "../schemas/backup";
import { youtubeLinkSchema, savedYoutubeIdSchema } from "../schemas/youtube";
import {
  personInputSchema,
  personUpdateSchema,
  personNameSchema,
  timingIdSchema,
  serviceTypeSchema,
  serviceTypeUpdateSchema,
  recordListSchema,
  recordSaveSchema,
  blockAdjustmentSchema,
  blockLeaderSchema,
} from "../schemas/timing";
import type { Person, ServiceType, ServiceRecord } from "../domain/models";
import type { Monitor, ProjectionStatus } from "../domain/monitors";
import type { ProjectionFrame } from "../domain/projection";
import {
  projectionFrameSchema,
  projectionStartSchema,
  videoTimeSchema,
} from "../schemas/projection";
import type { ConsoleData, ConsoleItem } from "../domain/console";
import { planTargetSchema, planMoveSchema, planIdSchema, slideEditSchema } from "../schemas/plan";
import type { Song, SongSummary } from "../domain/models";
import type { YouTubeVideo } from "../lib/youtube";
import {
  songInputSchema,
  songUpdateSchema,
  songDeleteSchema,
  songIdSchema,
  songListSchema,
  youtubeIdSchema,
} from "../schemas/songs";
import type { EventApi } from "./events";
import type { LocalMediaAsset, Paginated, StorageUsage } from "../domain/models";
import {
  mediaDetailsSchema,
  mediaIdSchema,
  mediaImportSchema,
  mediaListSchema,
  mediaMeasuresSchema,
  mediaRoleChangeSchema,
} from "../schemas/media";
import { z } from "@shared/zod";
import type { ChurchSettings, ProjectionSettings, Settings } from "../domain/models";
import type { SerializedError } from "../errors";
import { churchSchema, projectionSchema } from "../schemas/settings";

export function defineChannel<I, O>(
  name: string,
  input: z.ZodType<I>,
  output: z.ZodType<O>,
): { name: string; input: z.ZodType<I>; output: z.ZodType<O> } {
  return { name, input, output };
}

export const contract = {
  "bible:status": defineChannel("bible:status", z.void(), z.custom<BibleStatus>()),
  "bible:import": defineChannel("bible:import", z.void(), z.custom<BibleStatus | null>()),
  "bible:chapter": defineChannel("bible:chapter", bibleChapterSchema, z.custom<BibleChapter>()),
  "backup:export": defineChannel("backup:export", z.void(), z.object({ isCanceled: z.boolean() })),
  "backup:import": defineChannel(
    "backup:import",
    z.void(),
    z.custom<import("../schemas/backup").ImportResult | null>(),
  ),
  "backup:erase": defineChannel(
    "backup:erase",
    eraseSchema,
    z.custom<import("../schemas/backup").EraseResult>(),
  ),
  "backup:snapshot": defineChannel("backup:snapshot", z.void(), z.string()),
  "storage:details": defineChannel(
    "storage:details",
    z.void(),
    z.custom<{
      folders: { name: string; bytes: number }[];
      freeBytes: number;
      unused: LocalMediaAsset[];
      missing: LocalMediaAsset[];
    }>(),
  ),
  "app:open-folder": defineChannel("app:open-folder", z.enum(["home", "logs"]), z.void()),
  "youtube-videos:list": defineChannel(
    "youtube-videos:list",
    z.void(),
    z.custom<import("../domain/models").YoutubeVideo[]>(),
  ),
  "youtube-videos:get": defineChannel(
    "youtube-videos:get",
    savedYoutubeIdSchema,
    z.custom<import("../domain/models").YoutubeVideo>(),
  ),
  "youtube-videos:create": defineChannel(
    "youtube-videos:create",
    youtubeLinkSchema,
    z.custom<import("../domain/models").YoutubeVideo>(),
  ),
  "youtube-videos:delete": defineChannel("youtube-videos:delete", savedYoutubeIdSchema, z.void()),
  "people:list": defineChannel("people:list", z.void(), z.custom<Person[]>()),
  "people:create": defineChannel("people:create", personInputSchema, z.custom<Person>()),
  "people:update": defineChannel("people:update", personUpdateSchema, z.custom<Person>()),
  "people:delete": defineChannel("people:delete", timingIdSchema, z.void()),
  "people:find-or-add": defineChannel("people:find-or-add", personNameSchema, z.custom<Person>()),
  "service-types:list": defineChannel("service-types:list", z.void(), z.custom<ServiceType[]>()),
  "service-types:create": defineChannel(
    "service-types:create",
    serviceTypeSchema,
    z.custom<ServiceType>(),
  ),
  "service-types:update": defineChannel(
    "service-types:update",
    serviceTypeUpdateSchema,
    z.custom<ServiceType>(),
  ),
  "service-types:delete": defineChannel("service-types:delete", timingIdSchema, z.void()),
  "service-types:select": defineChannel(
    "service-types:select",
    timingIdSchema.nullable(),
    z.void(),
  ),
  "records:list": defineChannel(
    "records:list",
    recordListSchema,
    z.custom<Paginated<ServiceRecord>>(),
  ),
  "records:get": defineChannel("records:get", timingIdSchema, z.custom<ServiceRecord>()),
  "records:save": defineChannel("records:save", recordSaveSchema, z.custom<ServiceRecord>()),
  "records:delete": defineChannel("records:delete", timingIdSchema, z.void()),
  "records:adjust-duration": defineChannel(
    "records:adjust-duration",
    blockAdjustmentSchema,
    z.custom<ServiceRecord>(),
  ),
  "records:change-leader": defineChannel(
    "records:change-leader",
    blockLeaderSchema,
    z.custom<ServiceRecord>(),
  ),
  "times:load": defineChannel(
    "times:load",
    z.void(),
    z.custom<{
      records: ServiceRecord[];
      types: ServiceType[];
      people: Person[];
      timeZone: string;
      now: string;
    }>(),
  ),
  "sounds:list": defineChannel(
    "sounds:list",
    z.void(),
    z.custom<import("../domain/console").SoundEntry[]>(),
  ),
  "projection:report-error": defineChannel(
    "projection:report-error",
    z.string().min(1).max(200),
    z.void(),
  ),
  "projection:preferences": defineChannel(
    "projection:preferences",
    z.void(),
    z.custom<{ monitorId: number | null }>(),
  ),
  "monitors:list": defineChannel("monitors:list", z.void(), z.custom<Monitor[]>()),
  "projection:start": defineChannel(
    "projection:start",
    projectionStartSchema,
    z.custom<ProjectionStatus>(),
  ),
  "projection:stop": defineChannel("projection:stop", z.void(), z.custom<ProjectionStatus>()),
  "projection:get-status": defineChannel(
    "projection:get-status",
    z.void(),
    z.custom<ProjectionStatus>(),
  ),
  "projection:push-frame": defineChannel("projection:push-frame", projectionFrameSchema, z.void()),
  "projection:request-frame": defineChannel(
    "projection:request-frame",
    z.void(),
    z.custom<ProjectionFrame>(),
  ),
  "projection:video-time": defineChannel("projection:video-time", videoTimeSchema, z.void()),
  "projection:set-default-background": defineChannel(
    "projection:set-default-background",
    z.string().max(64).nullable(),
    z.void(),
  ),
  "console:load": defineChannel("console:load", z.void(), z.custom<ConsoleData>()),
  "plan:add": defineChannel("plan:add", planTargetSchema, z.custom<ConsoleItem>()),
  "plan:move": defineChannel("plan:move", planMoveSchema, z.void()),
  "plan:remove": defineChannel("plan:remove", planIdSchema, z.void()),
  "plan:clear": defineChannel("plan:clear", z.void(), z.void()),
  "console:item": defineChannel("console:item", planTargetSchema, z.custom<ConsoleItem>()),
  "songs:edit-slide": defineChannel("songs:edit-slide", slideEditSchema, z.custom<ConsoleItem>()),
  "songs:list": defineChannel("songs:list", songListSchema, z.custom<Paginated<SongSummary>>()),
  "songs:get": defineChannel("songs:get", songIdSchema, z.custom<Song>()),
  "songs:create": defineChannel(
    "songs:create",
    songInputSchema,
    z.custom<{ song: Song; warning?: string }>(),
  ),
  "songs:update": defineChannel(
    "songs:update",
    songUpdateSchema,
    z.custom<{ song: Song; warning?: string }>(),
  ),
  "songs:delete": defineChannel("songs:delete", songDeleteSchema, z.void()),
  "songs:archive": defineChannel("songs:archive", songIdSchema, z.custom<Song>()),
  "songs:unarchive": defineChannel("songs:unarchive", songIdSchema, z.custom<Song>()),
  "youtube:check": defineChannel(
    "youtube:check",
    youtubeIdSchema,
    z.custom<{ video?: YouTubeVideo; error?: string; isOffline?: boolean }>(),
  ),
  "media:list": defineChannel(
    "media:list",
    mediaListSchema,
    z.custom<Paginated<LocalMediaAsset>>(),
  ),
  "media:get": defineChannel("media:get", mediaIdSchema, z.custom<LocalMediaAsset>()),
  "media:import": defineChannel("media:import", mediaImportSchema, z.custom<LocalMediaAsset[]>()),
  "media:set-measures": defineChannel(
    "media:set-measures",
    mediaMeasuresSchema,
    z.custom<LocalMediaAsset>(),
  ),
  "media:update": defineChannel("media:update", mediaDetailsSchema, z.custom<LocalMediaAsset>()),
  "media:change-role": defineChannel(
    "media:change-role",
    mediaRoleChangeSchema,
    z.custom<LocalMediaAsset>(),
  ),
  "media:scan": defineChannel("media:scan", z.void(), z.custom<{ changed: number }>()),
  "media:delete": defineChannel("media:delete", mediaIdSchema, z.void()),
  "media:reveal": defineChannel("media:reveal", mediaIdSchema, z.void()),
  "media:open-home": defineChannel("media:open-home", z.void(), z.void()),
  "storage:usage": defineChannel("storage:usage", z.void(), z.custom<StorageUsage>()),
  "settings:get": defineChannel("settings:get", z.void(), z.custom<Settings>()),
  "settings:update-church": defineChannel(
    "settings:update-church",
    churchSchema,
    z.custom<ChurchSettings>(),
  ),
  "settings:update-projection": defineChannel(
    "settings:update-projection",
    projectionSchema,
    z.custom<ProjectionSettings>(),
  ),
  "app:info": defineChannel(
    "app:info",
    z.void(),
    z.custom<{ version: string; homePath: string }>(),
  ),
} as const;

export type ChannelName = keyof typeof contract;
export type ChannelInput<K extends ChannelName> = z.infer<(typeof contract)[K]["input"]>;
export type ChannelOutput<K extends ChannelName> = z.infer<(typeof contract)[K]["output"]>;
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: SerializedError };
export type IrisApi = {
  [K in ChannelName]: (input: ChannelInput<K>) => Promise<IpcResult<ChannelOutput<K>>>;
} & EventApi;
