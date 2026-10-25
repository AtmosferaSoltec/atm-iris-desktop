import { Film, Image as ImageIcon, Music } from "lucide-react";
import type { MediaAsset, MediaKind } from "@shared/domain/models";
import { MEDIA_RULES } from "@shared/domain/media-rules";
import { clock, fileSize } from "@shared/lib/format";

export const KIND_LABELS: Record<MediaKind, { plural: string; singular: string }> = {
  image: { plural: "Imágenes", singular: "Imagen" },
  video: { plural: "Videos", singular: "Video" },
  audio: { plural: "Audios", singular: "Audio" },
};

export const KIND_ICONS: Record<MediaKind, typeof Music> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
};

export const KIND_COLORS: Record<MediaKind, string> = {
  image: "var(--color-indigo)",
  video: "var(--color-rose)",
  audio: "var(--color-success)",
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "video/mp4": "MP4",
  "video/quicktime": "MOV",
  "audio/mpeg": "MP3",
  "audio/mp4": "M4A",
  "audio/aac": "AAC",
  "audio/wav": "WAV",
  "audio/x-wav": "WAV",
};

/** "JPG · 1920 × 1080 · 2,4 MB", "MP3 · 4:12 · 8,1 MB". */
export function fileFacts(asset: MediaAsset): string {
  const parts = [EXTENSIONS[asset.contentType] ?? asset.contentType];
  if (asset.width && asset.height) parts.push(`${asset.width} × ${asset.height}`);
  if (asset.durationSeconds !== null) parts.push(clock(asset.durationSeconds));
  parts.push(fileSize(asset.sizeBytes));
  return parts.join(" · ");
}

/** What the file picker of a section accepts. */
export function acceptedTypes(kinds: readonly MediaKind[]): string {
  return kinds.flatMap((kind) => MEDIA_RULES[kind].contentTypes).join(",");
}
