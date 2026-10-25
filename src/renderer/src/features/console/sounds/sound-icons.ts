import { SOUND_ICON_LABELS } from "../messages";
import {
  Bell,
  Drum,
  Guitar,
  Hand,
  Heart,
  Laugh,
  Megaphone,
  Mic,
  Music,
  PartyPopper,
  Siren,
  Sparkles,
  Trophy,
  Volume2,
  type LucideIcon,
} from "lucide-react";

/** The icons a sound can wear: the key is what the API stores in `soundIcon`. */
export const SOUND_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  volume: { icon: Volume2, label: SOUND_ICON_LABELS.volume },
  applause: { icon: Hand, label: SOUND_ICON_LABELS.applause },
  drum: { icon: Drum, label: SOUND_ICON_LABELS.drum },
  laugh: { icon: Laugh, label: SOUND_ICON_LABELS.laugh },
  bell: { icon: Bell, label: SOUND_ICON_LABELS.bell },
  partyPopper: { icon: PartyPopper, label: SOUND_ICON_LABELS.partyPopper },
  trophy: { icon: Trophy, label: SOUND_ICON_LABELS.trophy },
  music: { icon: Music, label: SOUND_ICON_LABELS.music },
  guitar: { icon: Guitar, label: SOUND_ICON_LABELS.guitar },
  mic: { icon: Mic, label: SOUND_ICON_LABELS.mic },
  megaphone: { icon: Megaphone, label: SOUND_ICON_LABELS.megaphone },
  siren: { icon: Siren, label: SOUND_ICON_LABELS.siren },
  sparkles: { icon: Sparkles, label: SOUND_ICON_LABELS.sparkles },
  heart: { icon: Heart, label: SOUND_ICON_LABELS.heart },
};

export { DEFAULT_SOUND_ICON, soundEntry } from "@shared/domain/sounds";
export const soundIconOf = (key: string): LucideIcon =>
  (SOUND_ICONS[key] ?? SOUND_ICONS.volume).icon;
