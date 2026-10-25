import {
  BookOpen,
  CirclePlay,
  Film,
  Image as ImageIcon,
  ListMusic,
  Music,
  Type,
} from "lucide-react";
import type { ConsoleItem } from "../model";

/** One icon and color per kind of thing, in the library and in the service. */
export const ENTRY_ICONS = {
  bible: { icon: BookOpen, color: "var(--color-violet)" },
  /** Lyrics only. */
  song: { icon: Type, color: "var(--color-ember)" },
  /** Lyrics and a track (an MP3 or YouTube). */
  songTrack: { icon: ListMusic, color: "var(--color-coral)" },
  /** A track only. */
  track: { icon: Music, color: "var(--color-success)" },
  image: { icon: ImageIcon, color: "var(--color-indigo)" },
  video: { icon: Film, color: "var(--color-rose)" },
  youtube: { icon: CirclePlay, color: "var(--color-danger)" },
} as const;

/** A song in the service: lyrics only, a track only, or both. */
export const itemIconKey = (item: ConsoleItem): keyof typeof ENTRY_ICONS =>
  item.kind === "song" && (item.file || item.youTubeId) ? "songTrack" : item.kind;
