import { bibleChapterSchema, bibleTranslationSchema } from "../schemas/bible";
import type { BibleChapter, BibleStatus } from "../domain/bible";
import { eraseSchema, exportFilesSchema } from "../schemas/backup";
import { updateStatusSchema } from "../schemas/updates";
import { songImportConfirmSchema, songImportSourceSchema } from "../schemas/song-import";
import { audioMatchConfirmSchema } from "../schemas/audio-match";
import {
  personInputSchema,
  personUpdateSchema,
  personNameSchema,
  timingIdSchema,
  serviceTypeSchema,
  serviceTypeUpdateSchema,
  recordListSchema,
  recordExportSchema,
  blockStartSchema,
  recordSaveSchema,
  blockAdjustmentSchema,
  blockLeaderSchema,
  blockSwapSchema,
} from "../schemas/timing";
import type { Person, ServiceType, ServiceRecord } from "../domain/models";
import type { Monitor, ProjectionStatus } from "../domain/monitors";
import type { ProjectionBackground, ProjectionFrame } from "../domain/projection";
import {
  projectionFrameSchema,
  projectionStartSchema,
  videoTimeSchema,
} from "../schemas/projection";
import { SLIDE_TEXT_SIZE, type ConsoleData, type ConsoleItem } from "../domain/console";
import { planTargetSchema, planMoveSchema, planIdSchema, slideEditSchema } from "../schemas/plan";
import type { Song, SongSummary } from "../domain/models";
import {
  songInputSchema,
  songUpdateSchema,
  songDeleteSchema,
  songIdSchema,
  songListSchema,
} from "../schemas/songs";
import type { EventApi } from "./events";
import { remoteStateSchema, type RemoteStatus } from "../remote/protocol";
import type { LocalMediaAsset, Paginated, StorageUsage } from "../domain/models";
import {
  mediaDetailsSchema,
  mediaRenameSchema,
  mediaIdSchema,
  mediaImportSchema,
  mediaListSchema,
  mediaMeasuresSchema,
  mediaRoleChangeSchema,
} from "../schemas/media";
import { z } from "@shared/zod";
import type {
  BibleAppearance,
  ChurchSettings,
  ProjectionSettings,
  Settings,
} from "../domain/models";
import type { SerializedError } from "../errors";
import {
  bibleAppearanceSchema,
  biblePresentSchema,
  churchSchema,
  projectionSchema,
} from "../schemas/settings";

export function defineChannel<I, O>(
  name: string,
  input: z.ZodType<I>,
  output: z.ZodType<O>,
): { name: string; input: z.ZodType<I>; output: z.ZodType<O> } {
  return { name, input, output };
}

export const contract = {
  "updates:status": defineChannel("updates:status", z.void(), updateStatusSchema),
  "updates:look": defineChannel(
    "updates:look",
    z.void(),
    z.custom<{ currentVersion: string; latestVersion: string | null; isNewer: boolean }>(),
  ),
  "updates:retry": defineChannel("updates:retry", z.void(), updateStatusSchema),
  "updates:download": defineChannel("updates:download", z.void(), updateStatusSchema),
  "updates:install": defineChannel("updates:install", z.void(), updateStatusSchema),
  "bible:select": defineChannel("bible:select", bibleTranslationSchema, z.custom<BibleStatus>()),
  "bible:status": defineChannel("bible:status", z.void(), z.custom<BibleStatus>()),
  "bible:import": defineChannel("bible:import", z.void(), z.custom<BibleStatus | null>()),
  "bible:chapter": defineChannel("bible:chapter", bibleChapterSchema, z.custom<BibleChapter>()),
  "backup:export": defineChannel("backup:export", z.void(), z.object({ isCanceled: z.boolean() })),
  "backup:import": defineChannel(
    "backup:import",
    z.void(),
    z.custom<import("../schemas/backup").ImportResult | null>(),
  ),
  "backup:export-files": defineChannel(
    "backup:export-files",
    exportFilesSchema,
    z.custom<import("../schemas/backup").ExportFilesResult>(),
  ),
  "songs:import-preview": defineChannel(
    "songs:import-preview",
    songImportSourceSchema,
    z.custom<import("../schemas/song-import").SongImportPreview | null>(),
  ),
  "songs:import-confirm": defineChannel(
    "songs:import-confirm",
    songImportConfirmSchema,
    z.custom<import("../schemas/song-import").SongImportResult>(),
  ),
  "songs:match-audio-preview": defineChannel(
    "songs:match-audio-preview",
    z.void(),
    z.custom<import("../schemas/audio-match").AudioMatchPreview>(),
  ),
  "songs:match-audio-confirm": defineChannel(
    "songs:match-audio-confirm",
    audioMatchConfirmSchema,
    z.custom<import("../schemas/audio-match").AudioMatchResult>(),
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
  "records:export": defineChannel(
    "records:export",
    recordExportSchema,
    z.custom<import("../schemas/timing").RecordExportResult>(),
  ),
  "records:get": defineChannel("records:get", timingIdSchema, z.custom<ServiceRecord>()),
  "records:save": defineChannel("records:save", recordSaveSchema, z.custom<ServiceRecord>()),
  "records:delete": defineChannel("records:delete", timingIdSchema, z.void()),
  "records:adjust-duration": defineChannel(
    "records:adjust-duration",
    blockAdjustmentSchema,
    z.custom<ServiceRecord>(),
  ),
  "records:change-start": defineChannel(
    "records:change-start",
    blockStartSchema,
    z.custom<ServiceRecord>(),
  ),
  "records:change-leader": defineChannel(
    "records:change-leader",
    blockLeaderSchema,
    z.custom<ServiceRecord>(),
  ),
  "records:swap-blocks": defineChannel(
    "records:swap-blocks",
    blockSwapSchema,
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
  "window:open-settings": defineChannel("window:open-settings", z.void(), z.void()),
  "window:open-bible": defineChannel("window:open-bible", z.void(), z.void()),
  "bible:present": defineChannel("bible:present", biblePresentSchema, z.void()),
  "bible:get-appearance": defineChannel(
    "bible:get-appearance",
    z.void(),
    z.custom<BibleAppearance>(),
  ),
  "bible:set-appearance": defineChannel(
    "bible:set-appearance",
    bibleAppearanceSchema,
    z.custom<BibleAppearance>(),
  ),
  "projection:backgrounds": defineChannel(
    "projection:backgrounds",
    z.void(),
    z.custom<ProjectionBackground[]>(),
  ),
  "settings:set-slide-text-size": defineChannel(
    "settings:set-slide-text-size",
    z.number().int().min(SLIDE_TEXT_SIZE.min).max(SLIDE_TEXT_SIZE.max),
    z.void(),
  ),
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
  "media:rename": defineChannel("media:rename", mediaRenameSchema, z.custom<LocalMediaAsset>()),
  "media:update": defineChannel("media:update", mediaDetailsSchema, z.custom<LocalMediaAsset>()),
  "media:change-role": defineChannel(
    "media:change-role",
    mediaRoleChangeSchema,
    z.custom<LocalMediaAsset>(),
  ),
  "media:scan": defineChannel("media:scan", z.void(), z.custom<{ changed: number }>()),
  "media:discard-track": defineChannel("media:discard-track", mediaIdSchema, z.void()),
  "media:delete": defineChannel("media:delete", mediaIdSchema, z.void()),
  "media:reveal": defineChannel("media:reveal", mediaIdSchema, z.void()),
  "media:open-folder": defineChannel(
    "media:open-folder",
    z.enum(["image", "video", "audio"]),
    z.void(),
  ),
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
  "onboarding:get": defineChannel("onboarding:get", z.void(), z.boolean()),
  "onboarding:complete": defineChannel("onboarding:complete", z.void(), z.void()),
  "app:open-atmosfera": defineChannel("app:open-atmosfera", z.void(), z.void()),
  "remote:status": defineChannel("remote:status", z.void(), z.custom<RemoteStatus>()),
  "remote:set-enabled": defineChannel("remote:set-enabled", z.boolean(), z.custom<RemoteStatus>()),
  "remote:new-link": defineChannel("remote:new-link", z.void(), z.custom<RemoteStatus>()),
  "remote:disconnect-all": defineChannel(
    "remote:disconnect-all",
    z.void(),
    z.custom<RemoteStatus>(),
  ),
  "remote:publish-state": defineChannel(
    "remote:publish-state",
    remoteStateSchema.nullable(),
    z.void(),
  ),
} as const;

export type ChannelName = keyof typeof contract;
export type ChannelInput<K extends ChannelName> = z.infer<(typeof contract)[K]["input"]>;
export type ChannelOutput<K extends ChannelName> = z.infer<(typeof contract)[K]["output"]>;
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: SerializedError };
export type IrisApi = {
  [K in ChannelName]: (input: ChannelInput<K>) => Promise<IpcResult<ChannelOutput<K>>>;
} & EventApi;
