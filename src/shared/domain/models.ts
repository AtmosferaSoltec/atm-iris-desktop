// Domain models shared by the whole app. Field names are the API contract's
// (docs/api-contract.md), so the API, the web and the consoles share one shape.

export type Id = string;

/** Contract §6. `fontFamily` is a key each client maps to a real font; `fontSizePt` is for a 1920-wide screen. */
export type ProjectionSettings = {
  /** A key from `PROJECTION_FONTS`. */
  fontFamily: string;
  fontSizePt: number;
  fontBold: boolean;
  fontItalic: boolean;
  /** All the lyrics in capitals. */
  uppercase: boolean;
  /** A built-in gradient id or a background image/video id; null shows black. */
  defaultBackgroundId: string | null;
};

export type Person = {
  id: Id;
  name: string;
  /** Blocks led in saved records, skipped ones excluded. */
  blockCount: number;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------------------------------------------- Services */

export type Schedule = {
  /** 1 = Sunday … 7 = Saturday, church local time. */
  weekday: number;
  hour: number;
  minute: number;
};

export type BlockTemplate = {
  id: Id;
  name: string;
  plannedMinutes: number;
};

export type ServiceType = {
  color?: "amber" | "coral" | "rose" | "violet" | "indigo" | "green";
  id: Id;
  name: string;
  schedule: Schedule | null;
  /** Empty when the service does not track time. Already in order. */
  blocks: BlockTemplate[];
  createdAt: string;
  updatedAt: string;
};

/* ------------------------------------------------------------------- Songs */

/** One projected screen of a song: optional section name + the text shown on the TV. */
export type SongSection = {
  id: Id;
  /** "Estrofa 1", "Coro"… Hidden when empty. */
  label: string | null;
  text: string;
};

/** The lyrics shown on the TV and the track played in the room, together (contract §10). */
export type Song = {
  id: Id;
  title: string;
  author: string;
  /** Empty when the song is only a track. */
  sections: SongSection[];
  /** The track (an audio `MediaAsset`); null when the song is only lyrics or its track is on YouTube. */
  audio: MediaAsset | null;
  /** The track on YouTube the video id. Played by YouTube's player, never downloaded. */
  youtubeId: string | null;
  /** Its background (a church background media); the console puts it up when the song is presented. */
  backgroundId: string | null;
  /** Explicitly archived: out of the library, with the lyrics and local track kept. */
  archivedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SongSummary = {
  id: Id;
  title: string;
  author: string;
  sectionCount: number;
  firstLine: string | null;
  audio: MediaAsset | null;
  youtubeId: string | null;
  backgroundId: string | null;
  archivedAt: string | null;
  lastUsedAt: string | null;
  updatedAt: string;
};

/* ------------------------------------------------------------------- Media */

export type MediaKind = "image" | "video" | "audio";

export type MediaAsset = {
  id: Id;
  kind: MediaKind;
  title: string;
  description: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Audio and video. */
  durationSeconds: number | null;
  /** Image and video. */
  width: number | null;
  height: number | null;
  /** Lyrics background (image or video); see `BACKGROUND_RULES`. */
  isBackground: boolean;
  /** Audio only: a sound effect for the console (applause, drum…) with this icon; null otherwise. */
  soundIcon: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ------------------------------------------------------------ Plan */

/**
 * `youtube`: a saved `YoutubeVideo`, by its id (contract §15).
 */
export type PlanItemKind = "song" | "media" | "youtube";

/** A YouTube video saved in Multimedia > YouTube: only the link, it plays in YouTube's player (contract §11b). */
export type YoutubeVideo = {
  id: Id;
  /** The video's 11 characters on YouTube. */
  videoId: string;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A song or a media asset staged ahead for the next service, from any
 * client (web, iPad, Windows). No history by service — just the current
 * state, synced to the consoles (contract §15).
 */
export type ServicePlanItem = {
  id: Id;
  kind: PlanItemKind;
  refId: Id;
  position: number;
  createdAt: string;
  updatedAt: string;
};

/* ----------------------------------------------------------- Time records */

/** `pending` and `running` only in a record in progress (contract §14). */
export type BlockRecordStatus = "pending" | "running" | "completed" | "skipped" | "adjusted";

/** A record is saved from the first block on (`inProgress`) so a closed console can pick it up again. */
export type RecordStatus = "inProgress" | "finished";

export type BlockRecord = {
  id: Id;
  name: string;
  plannedSeconds: number;
  actualSeconds: number;
  personId: Id | null;
  /** Name when the record was saved, so it stays readable after a rename or delete. */
  personName: string | null;
  status: BlockRecordStatus;
  /** The console's clock (UTC), to resume a block that was running. */
  startedAt: string | null;
  endedAt: string | null;
};

/** The saved timing of one service. Only times are stored, never the content used. */
export type ServiceRecord = {
  id: Id;
  /** Start of the first block, UTC. */
  date: string;
  serviceTypeId: Id | null;
  /** Copy, shown when the type is deleted. */
  serviceTypeName: string;
  /** In progress: shown as "En curso" and left out of every statistic until it ends. */
  status: RecordStatus;
  blocks: BlockRecord[];
  createdAt: string;
  updatedAt: string;
};

/* ------------------------------------------------------------------ Lists */

export type PageMeta = { page: number; limit: number; total: number; totalPages: number };

export type Paginated<T> = { data: T[]; meta: PageMeta };

export type ChurchSettings = {
  name: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};
export type Settings = { church: ChurchSettings; projection: ProjectionSettings };

export type MediaRole = "library" | "background" | "track" | "sound";
export type LocalMediaAsset = MediaAsset & {
  role: MediaRole;
  isMissing: boolean;
  needsMeasures: boolean;
};
export type StorageUsage = {
  usedBytes: number;
  freeBytes: number;
  breakdown: Record<MediaRole, number>;
};
