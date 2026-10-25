import type { MediaRole } from "@shared/domain/models";

export const ROLE_LABELS: Record<MediaRole, string> = {
  library: "Multimedia",
  background: "Fondos",
  track: "Pistas",
  sound: "Sonidos",
};
export const IMPORT_STATUS_TEXT = {
  measuring: "Leyendo el archivo…",
  requesting: "Preparando…",
  uploading: "Importando",
  confirming: "Guardando…",
  done: "Listo",
  error: "",
};
