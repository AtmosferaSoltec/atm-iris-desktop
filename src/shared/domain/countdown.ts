import { timerRemaining, type ProjectionContent } from "./projection";
export type Countdown = Extract<ProjectionContent, { kind: "timer" }> | null;
export type CountdownAction =
  | { type: "start"; seconds: number; label?: string; now: number }
  | { type: "pause" | "resume"; now: number }
  | { type: "hide" };
export function countdownReducer(state: Countdown, action: CountdownAction): Countdown {
  if (action.type === "hide") return null;
  if (action.type === "start") {
    if (!Number.isFinite(action.seconds) || action.seconds <= 0) return null;
    return {
      kind: "timer",
      seconds: Math.min(5999, Math.floor(action.seconds)),
      running: true,
      at: action.now,
      ...(action.label?.trim() ? { label: action.label.trim().slice(0, 60) } : {}),
    };
  }
  if (!state) return null;
  if (action.type === "pause")
    return { ...state, seconds: timerRemaining(state, action.now), running: false, at: action.now };
  return !state.running && state.seconds > 0 ? { ...state, running: true, at: action.now } : state;
}
