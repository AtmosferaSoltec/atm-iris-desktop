import { basename, extname, parse } from "node:path";
import { MEDIA_RULES, tooLargeMessage } from "@shared/domain/media-rules";
import type { MediaKind, MediaRole } from "@shared/domain/models";
import { AppError } from "@shared/errors";

const EXTENSIONS: Record<string, { kind: MediaKind; contentType: string }> = {
  ".jpg": { kind: "image", contentType: "image/jpeg" },
  ".jpeg": { kind: "image", contentType: "image/jpeg" },
  ".png": { kind: "image", contentType: "image/png" },
  ".webp": { kind: "image", contentType: "image/webp" },
  ".mp4": { kind: "video", contentType: "video/mp4" },
  ".mov": { kind: "video", contentType: "video/quicktime" },
  ".mp3": { kind: "audio", contentType: "audio/mpeg" },
  ".m4a": { kind: "audio", contentType: "audio/mp4" },
  ".aac": { kind: "audio", contentType: "audio/aac" },
  ".wav": { kind: "audio", contentType: "audio/wav" },
};
export function fileType(path: string): { kind: MediaKind; contentType: string } | null {
  return EXTENSIONS[extname(path).toLowerCase()] ?? null;
}
export function mediaFolder(role: MediaRole, kind: MediaKind): string {
  if (role === "background" && kind !== "audio") return "Backgrounds";
  if (role === "track" && kind === "audio") return "Audio";
  if (role === "sound" && kind === "audio") return "Sounds";
  if (role === "library" && kind === "image") return "Images";
  if (role === "library" && kind === "video") return "Videos";
  throw new AppError("FILE_TYPE_UNSUPPORTED", "Ese archivo no corresponde a esta sección.");
}
export function validateMediaFile(
  path: string,
  sizeBytes: number,
): { kind: MediaKind; contentType: string } {
  const type = fileType(path);
  if (!type)
    throw new AppError(
      "FILE_TYPE_UNSUPPORTED",
      "Ese tipo de archivo no se puede subir. Usa JPG, PNG, WebP, MP4, MOV, MP3, M4A, AAC o WAV.",
    );
  if (sizeBytes > MEDIA_RULES[type.kind].maxBytes)
    throw new AppError("FILE_TOO_LARGE", tooLargeMessage(type.kind));
  if (sizeBytes <= 0) throw new AppError("FILE_TYPE_UNSUPPORTED", "El archivo está vacío.");
  return type;
}
export function collisionName(fileName: string, index: number): string {
  // Windows file names cannot contain control characters.
  // eslint-disable-next-line no-control-regex
  const safeName = basename(fileName).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  const parsed = parse(safeName);
  const name = parsed.name.replace(/[. ]+$/g, "").slice(0, 160) || "archivo";
  const safeBase = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name) ? `_${name}` : name;
  return `${safeBase}${index > 1 ? ` (${index})` : ""}${parsed.ext}`;
}
