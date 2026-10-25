// Calendar math in the church's time zone (contract §2: everything travels in
// UTC; "today", "this month" and service schedules are local to the church).
// Built on Intl only, so it runs the same on the server, in the browser and in tests.

export type ZonedParts = {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 1 = Sunday … 7 = Saturday, like `Schedule.weekday`. */
  weekday: number;
  hour: number;
  minute: number;
  second: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const values: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) values[part.type] = part.value;
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: WEEKDAY_INDEX[values.weekday] ?? 1,
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

/** Minutes the zone is ahead of UTC at that instant (Lima: −300). */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/**
 * The UTC instant of a wall-clock time in the zone. Out-of-range values roll
 * over like Date.UTC (month 13 = January next year, day 0 = last of previous).
 */
export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day = 1,
  hour = 0,
  minute = 0,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle the offset around DST changes.
  let instant = guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60_000;
  instant = guess - zoneOffsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant);
}

/** Days since the epoch of the local calendar date: compares "same day" across zones. */
export function zonedDayNumber(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000);
}

/** Start of the local month containing `date`, moved by `offset` months. */
export function startOfZonedMonth(date: Date, timeZone: string, offset = 0): Date {
  const p = zonedParts(date, timeZone);
  return zonedTimeToUtc(timeZone, p.year, p.month + offset, 1);
}

/** Whether the runtime knows the zone (contract §6: it must be IANA). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
