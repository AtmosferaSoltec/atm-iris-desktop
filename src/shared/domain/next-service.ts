import { zonedDayNumber, zonedParts, zonedTimeToUtc } from "@shared/lib/zoned-time";
import type { ServiceType } from "./models";

/** A service still counts as "today" until two hours after it started (IRIS_SPEC §6.1b). */
export const TODAY_GRACE_MS = 2 * 60 * 60 * 1000;

export type NextService = {
  type: ServiceType;
  /** Next start in UTC; null for a type without schedule. */
  startsAt: Date | null;
  /** Starts today (church time), or started less than two hours ago. */
  isToday: boolean;
};

/** Next start of a weekly schedule at or after `now − 2 h`, in the church's zone. */
export function nextOccurrence(
  schedule: NonNullable<ServiceType["schedule"]>,
  now: Date,
  timeZone: string,
): Date {
  const today = zonedParts(now, timeZone);
  const daysAhead = (schedule.weekday - today.weekday + 7) % 7;
  const candidate = zonedTimeToUtc(
    timeZone,
    today.year,
    today.month,
    today.day + daysAhead,
    schedule.hour,
    schedule.minute,
  );
  if (candidate.getTime() >= now.getTime() - TODAY_GRACE_MS) return candidate;
  return zonedTimeToUtc(
    timeZone,
    today.year,
    today.month,
    today.day + daysAhead + 7,
    schedule.hour,
    schedule.minute,
  );
}

/**
 * The service the home card suggests: the scheduled type that starts soonest
 * (one that started under two hours ago is "today's"); without schedules, the
 * first type. Null when the church has none.
 */
export function nextService(types: ServiceType[], now: Date, timeZone: string): NextService | null {
  if (types.length === 0) return null;
  let best: { type: ServiceType; startsAt: Date } | null = null;
  for (const type of types) {
    if (!type.schedule) continue;
    const startsAt = nextOccurrence(type.schedule, now, timeZone);
    if (!best || startsAt.getTime() < best.startsAt.getTime()) best = { type, startsAt };
  }
  if (!best) return { type: types[0], startsAt: null, isToday: false };
  return {
    ...best,
    isToday: zonedDayNumber(best.startsAt, timeZone) === zonedDayNumber(now, timeZone),
  };
}
