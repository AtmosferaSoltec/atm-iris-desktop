import type { MediaKind } from "./models";

// Contract §11: what each kind accepts. The browser checks it before asking for
// an upload ticket; the API (and the mock) check it again.

const MB = 1024 * 1024;

export const MEDIA_RULES: Record<MediaKind, { contentTypes: readonly string[]; maxBytes: number }> =
  {
    image: { contentTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 20 * MB },
    video: { contentTypes: ["video/mp4", "video/quicktime"], maxBytes: 2048 * MB },
    audio: {
      contentTypes: ["audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav"],
      maxBytes: 200 * MB,
    },
  };

export const MEDIA_KINDS: readonly MediaKind[] = ["image", "video", "audio"];

/**
 * Where an asset lives in the web (contract §11): audio is a song's track (Canciones),
 * Fondos takes the backgrounds and Multimedia the rest of images and videos.
 */
export type MediaSection = "music" | "sounds" | "backgrounds" | "media";

export function mediaSection(asset: { kind: MediaKind; isBackground: boolean }): MediaSection {
  if (asset.kind === "audio") return "music";
  return asset.isBackground ? "backgrounds" : "media";
}

/** The kinds each upload section takes. Backgrounds narrow it further (`backgroundProblem`). */
export const SECTION_KINDS: Record<MediaSection, readonly MediaKind[]> = {
  music: ["audio"],
  sounds: ["audio"],
  backgrounds: ["image", "video"],
  media: ["image", "video"],
};

/** The kind a file belongs to by its MIME type, or null when Iris doesn't take it. */
export function mediaKindOf(contentType: string): MediaKind | null {
  return MEDIA_KINDS.find((kind) => MEDIA_RULES[kind].contentTypes.includes(contentType)) ?? null;
}

// The API's texts are not in the contract yet; these are the ones the mock
// sends and the browser shows before asking (see phase 05 deviations).
export const MEDIA_ERRORS = {
  UNSUPPORTED_MEDIA_TYPE:
    "Ese tipo de archivo no se puede subir. Usa JPG, PNG, WebP, MP4, MOV, MP3, M4A, AAC o WAV.",
  FILE_TOO_LARGE: "El archivo es demasiado grande.",
  UPLOAD_NOT_FOUND: "El archivo no llegó al almacenamiento. Vuelve a subirlo.",
} as const;

/** Shown when a file is dropped in the wrong section; the API would take it, the section doesn't. */
export const WRONG_SECTION: Record<MediaSection, string> = {
  music: "Una pista es un archivo de audio: MP3, M4A, AAC o WAV.",
  sounds: "Un sonido es un archivo de audio: MP3, M4A, AAC o WAV.",
  backgrounds: "Un fondo es una imagen o un video.",
  media: "Las pistas se suben en Canciones, dentro de cada canción.",
};

export function tooLargeMessage(kind: MediaKind): string {
  const limit = MEDIA_RULES[kind].maxBytes / MB;
  const pretty = limit >= 1024 ? `${limit / 1024} GB` : `${limit} MB`;
  return `${MEDIA_ERRORS.FILE_TOO_LARGE} El máximo es ${pretty}.`;
}

/**
 * What a file needs to be a lyrics background (contract §11). The API has the
 * same table in `src/modules/media/media.background.ts`: change a value in both.
 * Any size and shape: the background fills the screen, cropping what is left over.
 * Only the weight is limited and, for a video, its length: it loops without sound.
 */
export const BACKGROUND_RULES = {
  image: { contentTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 15 * MB },
  video: { contentTypes: ["video/mp4", "video/quicktime"], maxBytes: 200 * MB, maxSeconds: 30 },
} as const;

/** A "30 s" video often measures 30.03 s. */
const SECONDS_TOLERANCE = 0.5;

export const BACKGROUND_TYPES = [
  ...BACKGROUND_RULES.image.contentTypes,
  ...BACKGROUND_RULES.video.contentTypes,
];

type BackgroundCandidate = {
  kind: MediaKind;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

/** Why a file can't be a background, or null when it can. */
export function backgroundProblem(media: BackgroundCandidate): string | null {
  if (media.kind === "audio") return "Un audio no puede ser fondo. Usa una imagen o un video.";
  const rules = BACKGROUND_RULES[media.kind];
  if (!(rules.contentTypes as readonly string[]).includes(media.contentType)) {
    return media.kind === "video"
      ? "El video de fondo debe ser MP4 o MOV."
      : "La imagen de fondo debe ser JPG, PNG o WebP.";
  }
  if (media.sizeBytes > rules.maxBytes) {
    return `El archivo pesa demasiado para un fondo. El máximo es ${rules.maxBytes / MB} MB.`;
  }
  if (media.kind === "video") {
    if (media.durationSeconds === null) return "No pudimos medir el video. Prueba con otro.";
    const { maxSeconds } = BACKGROUND_RULES.video;
    if (media.durationSeconds > maxSeconds + SECONDS_TOLERANCE) {
      return `El video de fondo dura como máximo ${maxSeconds} segundos: se repite en bucle.`;
    }
  }
  return null;
}
