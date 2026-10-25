import type { MediaAsset } from "./models";
import type { SoundEntry } from "./console";
export const SOUND_ICON_KEYS = [
  "volume",
  "applause",
  "drum",
  "laugh",
  "bell",
  "partyPopper",
  "trophy",
  "music",
  "guitar",
  "mic",
  "megaphone",
  "siren",
  "sparkles",
  "heart",
] as const;
export type SoundIconKey = (typeof SOUND_ICON_KEYS)[number];
export const DEFAULT_SOUND_ICON = "volume";
export function soundEntry(asset: Pick<MediaAsset, "id" | "title" | "soundIcon">): SoundEntry {
  return {
    id: asset.id,
    title: asset.title,
    icon:
      asset.soundIcon &&
      SOUND_ICON_KEYS.includes(asset.soundIcon as (typeof SOUND_ICON_KEYS)[number])
        ? asset.soundIcon
        : DEFAULT_SOUND_ICON,
  };
}
