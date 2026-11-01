import { z } from "@shared/zod";

/**
 * The language the iPad and the console speak (JSON, one message per WebSocket frame). It is
 * versioned: a different `PROTOCOL_VERSION` is refused at the greeting so neither side guesses.
 */
export const PROTOCOL_VERSION = 1;
export const REMOTE_SERVICE_TYPE = "iris";
export const REMOTE_PATH = "/remote";
export const CODE_LENGTH = 6;

// ----- What the iPad sees (the console publishes it; main only relays it) -----

const slideSchema = z.object({ label: z.string().nullable(), text: z.string().max(4000) });

export const remoteItemSchema = z.object({
  id: z.string().max(80),
  kind: z.enum(["song", "track", "image", "video", "youtube", "bible"]),
  title: z.string().max(200),
  subtitle: z.string().max(200).nullable(),
  slides: z.array(slideSchema).max(400),
  /** Has a track or a video the iPad can play/pause. */
  isPlayable: z.boolean(),
  backgroundId: z.string().max(80).nullable(),
});

const remoteBlockSchema = z.object({
  name: z.string().max(120),
  leaderId: z.string().max(80).nullable(),
  plannedSeconds: z.number().min(0),
  status: z.enum(["done", "current", "pending", "skipped"]),
  leader: z.string().max(120).nullable(),
});

export const remoteStateSchema = z.object({
  churchName: z.string().max(120),
  items: z.array(remoteItemSchema).max(300),
  /** The element selected on the console (its slides are the ones the iPad shows). */
  openId: z.string().max(80).nullable(),
  /** What is on the screens: an element and one of its slides. */
  live: z.object({ id: z.string().max(80), slide: z.number().int().min(0) }).nullable(),
  isCleared: z.boolean(),
  playback: z
    .object({
      id: z.string().max(80),
      kind: z.enum(["track", "video"]),
      title: z.string().max(200),
      isPlaying: z.boolean(),
      /** Seconds already played at the moment the state was built. */
      position: z.number().min(0),
      duration: z.number().min(0),
      isLooping: z.boolean(),
      hasError: z.boolean(),
    })
    .nullable(),
  volume: z.number().min(0).max(1),
  backgroundId: z.string().max(80).nullable(),
  backgrounds: z
    .array(
      z.object({
        id: z.string().max(80),
        name: z.string().max(120),
        colors: z.array(z.string().max(16)).max(8),
      }),
    )
    .max(200),
  sounds: z.array(z.object({ id: z.string().max(80), title: z.string().max(120) })).max(200),
  countdown: z
    .object({
      remainingSeconds: z.number().min(0),
      isRunning: z.boolean(),
      label: z.string().max(60).nullable(),
    })
    .nullable(),
  service: z
    .object({
      name: z.string().max(120),
      phase: z.enum(["notStarted", "running", "finished"]),
      blocks: z.array(remoteBlockSchema).max(60),
      /** Seconds the current block has run, at the moment the state was built. */
      elapsedSeconds: z.number().min(0),
      canAdvance: z.boolean(),
    })
    .nullable(),
  /** The church's services, to choose one before it starts (creating them is done on the computer). */
  serviceTypes: z.array(z.object({ id: z.string().max(80), name: z.string().max(120) })).max(100),
  selectedServiceTypeId: z.string().max(80).nullable(),
  /** False once a service is running: it is finished on the computer or from the last block. */
  canChooseService: z.boolean(),
  people: z.array(z.object({ id: z.string().max(80), name: z.string().max(120) })).max(500),
  /** Images and videos of the computer's library: shown on the screens without joining the service. */
  library: z
    .array(
      z.object({
        id: z.string().max(80),
        kind: z.enum(["image", "video"]),
        title: z.string().max(200),
        durationSeconds: z.number().min(0).nullable(),
      }),
    )
    .max(2000),
  /** The Bibles imported on the computer; the iPad only reads them. */
  bibles: z.array(z.object({ code: z.string().max(40), name: z.string().max(120) })).max(20),
  selectedBible: z.string().max(40).nullable(),
});
export type RemoteState = z.infer<typeof remoteStateSchema>;
export type RemoteItem = z.infer<typeof remoteItemSchema>;

// ----- What the iPad can ask for. Nothing here adds, removes or edits content. -----

export const remoteCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("select"), id: z.string().max(80) }),
  z.object({
    type: z.literal("show-slide"),
    id: z.string().max(80),
    slide: z.number().int().min(0),
  }),
  z.object({ type: z.literal("set-cleared"), value: z.boolean() }),
  z.object({
    type: z.literal("playback"),
    action: z.enum(["play", "pause", "stop", "restart", "loop-on", "loop-off"]),
  }),
  z.object({ type: z.literal("seek"), seconds: z.number().min(0).max(86_400) }),
  z.object({ type: z.literal("volume"), value: z.number().min(0).max(1) }),
  z.object({ type: z.literal("set-background"), id: z.string().max(80).nullable() }),
  z.object({
    type: z.literal("countdown"),
    action: z.enum(["start", "pause", "resume", "hide"]),
    seconds: z.number().int().min(1).max(5999).optional(),
    label: z.string().max(60).optional(),
  }),
  z.object({ type: z.literal("play-sound"), id: z.string().max(80) }),
  z.object({ type: z.literal("next-block") }),
  z.object({ type: z.literal("finish-service") }),
  z.object({ type: z.literal("choose-service"), id: z.string().max(80) }),
  /** An extra block for this service only, placed at `at` (never before the running block). */
  z.object({
    type: z.literal("add-block"),
    name: z.string().trim().min(1).max(60),
    minutes: z.number().int().min(1).max(240),
    at: z.number().int().min(0).max(60),
  }),
  /** Who leads a block: someone listed, or a new name (added to the people, like on the computer). */
  z.object({
    type: z.literal("set-leader"),
    block: z.number().int().min(0).max(60),
    personId: z.string().max(80).optional(),
    name: z.string().trim().min(1).max(120).optional(),
  }),
  z.object({ type: z.literal("present-media"), id: z.string().max(80) }),
  /** A passage straight to the screens, once: it never joins the service. */
  z.object({
    type: z.literal("present-bible"),
    translation: z.string().max(40),
    bookId: z.string().max(8),
    chapter: z.number().int().min(1).max(150),
    from: z.number().int().min(1).max(200),
    to: z.number().int().min(1).max(200),
  }),
]);

/** Questions the iPad asks to browse what only the computer has (main answers them). */
export const remoteRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("bible-books") }),
  z.object({
    kind: z.literal("bible-chapter"),
    translation: z.string().max(40),
    bookId: z.string().max(8),
    chapter: z.number().int().min(1).max(150),
  }),
]);
export type RemoteRequest = z.infer<typeof remoteRequestSchema>;
export type RemoteResponse =
  | { books: { id: string; name: string; testament: "old" | "new"; chapterCount: number }[] }
  | { verses: { number: number; text: string }[] };
export type RemoteCommand = z.infer<typeof remoteCommandSchema>;

// ----- Messages on the wire -----

/** First message of every connection: a one-time code, or the token of a session still open. */
export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pair"),
    protocol: z.number().int(),
    code: z.string().regex(/^\d+$/).max(12),
    deviceName: z.string().max(60).optional(),
  }),
  z.object({ type: z.literal("resume"), protocol: z.number().int(), token: z.string().max(100) }),
  z.object({ type: z.literal("command"), command: remoteCommandSchema }),
  z.object({ type: z.literal("request"), id: z.string().max(40), request: remoteRequestSchema }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const REMOTE_ERROR_CODES = [
  "WRONG_CODE",
  "CODE_EXPIRED",
  "TOO_MANY_ATTEMPTS",
  "PROTOCOL_MISMATCH",
  "BAD_TOKEN",
  "BAD_MESSAGE",
] as const;
export type RemoteErrorCode = (typeof REMOTE_ERROR_CODES)[number];

export type ServerMessage =
  | { type: "paired"; protocol: number; token: string; computerName: string }
  /** `null`: the console is not on screen (Settings, Times…), so there is nothing to control right now. */
  | { type: "state"; state: RemoteState | null }
  | { type: "error"; code: RemoteErrorCode; message: string }
  | ({ type: "response"; id: string } & (RemoteResponse | { error: string }))
  | { type: "bye"; reason: "disconnected" | "disabled" };

// ----- What the console's own window shows about the remote control -----

export type RemoteStatus = {
  isEnabled: boolean;
  /** The one-time code to type on the iPad; null while disabled. */
  code: string | null;
  codeExpiresAt: string | null;
  port: number | null;
  /** Local addresses, for the manual fallback. */
  addresses: string[];
  deviceCount: number;
};
