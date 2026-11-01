import { timerRemaining } from "@shared/domain/projection";
import type { Countdown } from "@shared/domain/countdown";
import { elapsedSeconds, nextIndex, type ServiceTimer } from "@shared/domain/block-timer";
import type { RemoteState } from "@shared/remote/protocol";
import type { ConsoleItem, SoundEntry } from "../console/model";
import type { Playback } from "../console/use-live-console";
import type { ProjectionBackground } from "../projection/model";

export type RemoteStateInput = {
  churchName: string;
  items: ConsoleItem[];
  /** The element selected on the console; it may be a Bible passage that is not in the service. */
  openItem: ConsoleItem | null;
  live: { key: string; slide: number } | null;
  isCleared: boolean;
  playback: Playback | null;
  volume: number;
  backgroundId: string | null;
  backgrounds: ProjectionBackground[];
  sounds: SoundEntry[];
  countdown: Countdown;
  service: { name: string; timer: ServiceTimer } | null;
  now: number;
};

/** What the iPad needs to draw the console, and nothing it could use to reach a file. */
export function buildRemoteState(input: RemoteStateInput): RemoteState {
  const { now, playback, countdown, service } = input;
  const shown =
    input.openItem && !input.items.some((item) => item.planItemId === input.openItem?.planItemId)
      ? [...input.items, input.openItem]
      : input.items;
  return {
    churchName: input.churchName,
    items: shown.map((item) => ({
      id: item.planItemId,
      kind: item.kind,
      title: item.title,
      subtitle: item.subtitle,
      slides: item.slides.map((slide) => ({ label: slide.label, text: slide.text })),
      isPlayable: Boolean(item.file || item.youTubeId),
      backgroundId: item.backgroundId ?? null,
    })),
    openId: input.openItem?.planItemId ?? null,
    live: input.live ? { id: input.live.key, slide: input.live.slide } : null,
    isCleared: input.isCleared,
    playback: playback
      ? {
          id: playback.key,
          kind: playback.kind,
          title: playback.title,
          isPlaying: playback.playing,
          position: playback.playing
            ? Math.min(
                playback.position + (now - playback.at) / 1000,
                playback.duration > 0 ? playback.duration : Infinity,
              )
            : playback.position,
          duration: playback.duration,
          isLooping: playback.loop,
          hasError: Boolean(playback.error),
        }
      : null,
    volume: input.volume,
    backgroundId: input.backgroundId,
    backgrounds: input.backgrounds.map((background) => ({
      id: background.id,
      name: background.name,
      colors: background.colors,
    })),
    sounds: input.sounds.map((sound) => ({ id: sound.id, title: sound.title })),
    countdown: countdown
      ? {
          remainingSeconds: timerRemaining(countdown, now),
          isRunning: countdown.running,
          label: countdown.label ?? null,
        }
      : null,
    service: service ? serviceState(service.name, service.timer, now) : null,
  };
}

function serviceState(name: string, timer: ServiceTimer, now: number): RemoteState["service"] {
  const current = timer.current;
  return {
    name,
    phase: timer.phase,
    blocks: timer.blocks.map((block, index) => ({
      name: block.name,
      plannedSeconds: block.plannedSeconds,
      leader: block.personName,
      status: block.isSkipped
        ? "skipped"
        : index === current && timer.phase === "running"
          ? "current"
          : block.endedAt !== null
            ? "done"
            : "pending",
    })),
    elapsedSeconds: current !== null ? elapsedSeconds(timer.blocks[current]!, now) : 0,
    canAdvance: timer.phase !== "finished" && nextIndex(timer) !== null,
  };
}

/**
 * Whether the iPad needs this state now. A playing track, a running countdown and the block's
 * clock move on their own on the iPad, so only a jump (a seek, a restart, a new countdown) or
 * any other change is worth sending.
 */
export function shouldPublish(
  previous: { state: RemoteState; at: number } | null,
  next: RemoteState,
  now: number,
): boolean {
  if (!previous) return true;
  const before = previous.state;
  if (JSON.stringify(withoutClock(before)) !== JSON.stringify(withoutClock(next))) return true;
  const seconds = (now - previous.at) / 1000;
  if (before.playback && next.playback) {
    const expected = before.playback.isPlaying
      ? before.playback.position + seconds
      : before.playback.position;
    if (Math.abs(next.playback.position - expected) > 1.5) return true;
  }
  if (before.countdown?.isRunning && next.countdown) {
    if (
      Math.abs(next.countdown.remainingSeconds - (before.countdown.remainingSeconds - seconds)) >
      1.5
    )
      return true;
  }
  if (before.service?.phase === "running" && next.service) {
    if (Math.abs(next.service.elapsedSeconds - (before.service.elapsedSeconds + seconds)) > 1.5)
      return true;
  }
  return false;
}

/** The same state with the values that tick by themselves set aside. */
function withoutClock(state: RemoteState): unknown {
  return {
    ...state,
    playback: state.playback && { ...state.playback, position: 0 },
    countdown: state.countdown && {
      ...state.countdown,
      remainingSeconds: state.countdown.isRunning ? 0 : state.countdown.remainingSeconds,
    },
    service: state.service && { ...state.service, elapsedSeconds: 0 },
  };
}
