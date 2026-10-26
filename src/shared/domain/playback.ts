export function playbackPosition(
  state: { playing: boolean; position: number; at: number },
  now: number,
): number {
  return Math.max(0, state.position + (state.playing ? (now - state.at) / 1000 : 0));
}
export function shouldSeekVideo(current: number, target: number): boolean {
  return Math.abs(current - target) > 0.6;
}

type Timeline = {
  fileId: string;
  kind: "track" | "video";
  playing: boolean;
  position: number;
  at: number;
  duration: number;
  loop: boolean;
};
export function followPlayback<T extends Timeline>(
  current: T,
  report: { id: string; position: number; duration: number },
  _isSound: boolean,
  now: number,
): T | null {
  const { position, duration } = report;
  if (current.kind !== "video" || current.fileId !== report.id || !duration) return current;
  if (current.playing && position >= duration - 0.25)
    return current.loop ? { ...current, duration, position: 0, at: now } : null;
  return Math.abs(duration - current.duration) > 0.5 ? { ...current, duration } : current;
}
export function ownBackgroundOnPresent(
  key: string,
  previousKey: string | null,
  ownId: string | null | undefined,
  availableIds: readonly string[],
): string | undefined {
  return key !== previousKey && ownId && availableIds.includes(ownId) ? ownId : undefined;
}
