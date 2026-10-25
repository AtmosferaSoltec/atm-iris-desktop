import type { ConsoleItem } from "./model";
export const KIND_NAMES: Record<ConsoleItem["kind"], string> = {
  song: "Canción",
  bible: "Biblia",
  track: "Pista",
  image: "Imagen",
  video: "Video",
  youtube: "YouTube",
};
export const MEDIA_EMPTY = {
  image: "Aún no hay imágenes. Súbelas con el botón o arrástralas aquí.",
  video: "Aún no hay videos. Súbelos con el botón o arrástralos aquí.",
  youtube: "Aún no hay enlaces de YouTube. Agrega el primero con el botón.",
};
export const UPLOAD_LABELS = { image: "Subir imágenes", video: "Subir videos" };

export const TOOL_LABELS = { text: "Texto", timer: "Temporizador", sounds: "Sonidos" };
export const SOUND_ICON_LABELS = {
  volume: "Sonido",
  applause: "Aplausos",
  drum: "Tambor",
  laugh: "Risas",
  bell: "Campana",
  partyPopper: "Fiesta",
  trophy: "Premio",
  music: "Música",
  guitar: "Guitarra",
  mic: "Micrófono",
  megaphone: "Megáfono",
  siren: "Sirena",
  sparkles: "Destello",
  heart: "Corazón",
};
