import type { Person, ProjectionSettings, ServiceRecord, ServiceType } from "./models";
import type { ProjectionBackground } from "./projection";

/** One element of the service in the console (IRIS_SPEC §6.2). */
export type ConsoleItem = {
  /** The plan row (contract §15): moving or removing it here moves or removes it everywhere. */
  planItemId: string;
  refId: string;
  /** `track` is a song that is only a track: it plays in the room, the screen does not change. */
  kind: "song" | "track" | "image" | "video" | "bible";
  title: string;
  subtitle: string | null;
  /** A song's lyrics, one per screen; a passage's whole chapter, one verse per screen. */
  slides: ConsoleSlide[];
  /** A passage: the slides it chose (the rest of the chapter is there for "anterior/siguiente"). */
  focus?: { first: number; last: number };
  /** The file: the image or video, or the song's track. Null for lyrics only. */
  file: ConsoleFile | null;
  /** A song's own background: put up when it is presented (never forced afterwards). */
  backgroundId?: string | null;
};

export type ConsoleSlide = {
  id: string;
  label: string | null;
  text: string;
  /** Under the text on the screens: a verse's reference ("Juan 3:16 · RVR1960"). */
  footnote?: string;
};

export type ConsoleFile = {
  id: string;
  /** Local asset URI resolved by main; never a filesystem path. */
  url: string;
  durationSeconds: number | null;
};

/** What the BIBLIOTECA panel lists; full songs load when one is added. */
export type LibraryEntry = {
  kind: "song" | "media";
  id: string;
  title: string;
  subtitle: string;
  /** For the icon: lyrics only, lyrics with a track, a track-only song, an image, a video or a video. */
  icon: "song" | "songTrack" | "track" | "image" | "video";
  durationSeconds: number | null;
  /** Images and videos: a picture (or a video's first frame) for the library's grid. */
  previewUrl: string | null;
  /** A song's artist, to filter the library by it. */
  author?: string;
  /** A song with an uploaded audio file (MP3): shown with a music icon. */
  hasAudio?: boolean;
};

/** A sound effect the church uploaded: one click plays it in the room. */
export type SoundEntry = { id: string; title: string; icon: string };

export type ConsoleData = {
  churchName: string;
  projection: ProjectionSettings;
  items: ConsoleItem[];
  library: LibraryEntry[];
  backgrounds: ProjectionBackground[];
  sounds: SoundEntry[];
  timeZone: string;
  /** For the block timer (IRIS_SPEC §6.9). */
  serviceTypes: ServiceType[];
  people: Person[];
  /** The service running (saved from its first block): the console picks it up on its own. */
  inProgress: ServiceRecord | null;
  /** The service chosen but not started yet (a cookie): survives a reload until it ends. */
  selectedServiceTypeId: string | null;
};
